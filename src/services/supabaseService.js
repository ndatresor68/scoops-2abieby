import {
  cacheTableData,
  executeMutation,
  getCachedEntry,
  getCachedTableData,
  isOfflineMode,
  setRawSupabaseClient,
} from "./offlineService"

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
}

function cloneData(value) {
  if (Array.isArray(value)) return value.map((item) => cloneData(item))
  if (isObject(value)) return { ...value }
  return value
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (!data) return []
  return [data]
}

function getByPath(row, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], row)
}

function matchesLike(value, pattern, insensitive = false) {
  const source = `${value ?? ""}`
  const target = `${pattern ?? ""}`.replace(/%/g, ".*")
  const regex = new RegExp(`^${target}$`, insensitive ? "i" : "")
  return regex.test(source)
}

function matchesFilter(row, filter) {
  const currentValue = getByPath(row, filter.column)

  if (filter.type === "eq") return String(currentValue) === String(filter.value)
  if (filter.type === "neq") return String(currentValue) !== String(filter.value)
  if (filter.type === "in") return (filter.value || []).map(String).includes(String(currentValue))
  if (filter.type === "like") return matchesLike(currentValue, filter.value, false)
  if (filter.type === "ilike") return matchesLike(currentValue, filter.value, true)
  if (filter.type === "not") {
    if (filter.operator === "is") return currentValue !== null
    return String(currentValue) !== String(filter.value)
  }

  return true
}

function splitTopLevel(expression) {
  const parts = []
  let current = ""
  let depth = 0

  for (const char of `${expression || ""}`) {
    if (char === "," && depth === 0) {
      if (current.trim()) parts.push(current.trim())
      current = ""
      continue
    }

    if (char === "(") depth += 1
    if (char === ")") depth = Math.max(0, depth - 1)
    current += char
  }

  if (current.trim()) parts.push(current.trim())
  return parts
}

function parseCondition(condition) {
  const [column, operator, ...rest] = condition.split(".")
  return { type: operator, column, value: rest.join(".") }
}

function applyOrFilter(rows, expression) {
  const conditions = splitTopLevel(expression)

  if (!conditions.length) return rows

  return rows.filter((row) =>
    conditions.some((condition) => {
      if (condition.startsWith("and(") && condition.endsWith(")")) {
        const nested = splitTopLevel(condition.slice(4, -1))
        return nested.every((entry) => matchesFilter(row, parseCondition(entry)))
      }

      return matchesFilter(row, parseCondition(condition))
    }),
  )
}

function applyFilters(rows, state) {
  let nextRows = Array.isArray(rows) ? [...rows] : []

  for (const filter of state.filters) {
    nextRows = nextRows.filter((row) => matchesFilter(row, filter))
  }

  for (const expression of state.orFilters) {
    nextRows = applyOrFilter(nextRows, expression)
  }

  for (const order of state.orders) {
    nextRows.sort((left, right) => {
      const leftValue = getByPath(left, order.column)
      const rightValue = getByPath(right, order.column)

      if (leftValue === rightValue) return 0
      if (leftValue == null) return order.ascending ? 1 : -1
      if (rightValue == null) return order.ascending ? -1 : 1

      if (leftValue > rightValue) return order.ascending ? 1 : -1
      return order.ascending ? -1 : 1
    })
  }

  if (typeof state.limitValue === "number") {
    nextRows = nextRows.slice(0, state.limitValue)
  }

  return nextRows
}

function formatOfflineReadResponse(rows, state) {
  if (state.selectOptions?.head) {
    return {
      data: null,
      count: rows.length,
      error: null,
    }
  }

  if (state.expectSingle) {
    const row = rows[0] || null
    if (!row && state.singleRequired) {
      return {
        data: null,
        error: { message: "No rows found" },
      }
    }

    return { data: row, error: null, count: rows.length }
  }

  return { data: rows, error: null, count: rows.length }
}

function formatMutationResponse(result, state, mutation) {
  if (result?.error) {
    return result
  }

  if (mutation.action === "delete") {
    return { data: null, error: null }
  }

  const rows = normalizeRows(result?.data)

  if (!state.selectCalled && mutation.action !== "delete") {
    return { data: null, error: null }
  }

  if (state.expectSingle) {
    return { data: rows[0] || null, error: null }
  }

  return { data: rows, error: null }
}

function createQueryProxy(state) {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return async (resolve, reject) => {
            try {
              if (!state.mutation && isOfflineMode()) {
                const cachedRows = await getCachedEntry(state.table)
                const filteredRows = applyFilters(getCachedTableData(state.table) || cachedRows, state)
                resolve(formatOfflineReadResponse(filteredRows, state))
                return
              }

              if (state.mutation) {
                const result = await executeMutation({
                  table: state.table,
                  action: state.mutation.action,
                  data: state.mutation.data,
                  match: state.mutation.match,
                })

                resolve(formatMutationResponse(result, state, state.mutation))
                return
              }

              const response = await state.rawQuery

              if (!response?.error) {
                if (Array.isArray(response?.data)) {
                  cacheTableData(state.table, response.data)
                } else if (response?.data && isObject(response.data)) {
                  const existingRows = getCachedTableData(state.table)
                  cacheTableData(state.table, [...existingRows.filter((row) => String(row?.id) !== String(response.data?.id)), response.data])
                }
              }

              resolve(response)
            } catch (error) {
              if (typeof reject === "function") {
                reject(error)
                return
              }

              throw error
            }
          }
        }

        if (prop === "catch") {
          return (handler) => createQueryProxy(state).then(undefined, handler)
        }

        if (prop === "finally") {
          return (handler) =>
            createQueryProxy(state).then(
              (value) => {
                handler?.()
                return value
              },
              (error) => {
                handler?.()
                throw error
              },
            )
        }

        if (prop === "select") {
          return (columns = "*", options = {}) => {
            state.selectCalled = true
            state.selectColumns = columns
            state.selectOptions = options
            if (!state.mutation) {
              state.rawQuery = state.rawQuery.select(columns, options)
            } else if (typeof state.rawQuery?.select === "function") {
              state.rawQuery = state.rawQuery.select(columns, options)
            }
            return createQueryProxy(state)
          }
        }

        if (prop === "insert" || prop === "update" || prop === "upsert" || prop === "delete") {
          return (value, options = {}) => {
            if (prop === "delete") {
              state.mutation = { action: "delete", data: null, match: state.match }
              state.rawQuery = state.rawQuery.delete()
              return createQueryProxy(state)
            }

            const action = prop === "upsert" ? "insert" : prop
            const data = prop === "insert" || prop === "upsert" ? cloneData(normalizeRows(value)) : cloneData(value)
            state.mutation = { action, data, match: state.match, options }
            state.rawQuery = state.rawQuery[prop](value, options)
            return createQueryProxy(state)
          }
        }

        if (prop === "single" || prop === "maybeSingle") {
          return () => {
            state.expectSingle = true
            state.singleRequired = prop === "single"
            if (typeof state.rawQuery?.[prop] === "function") {
              state.rawQuery = state.rawQuery[prop]()
            }
            return createQueryProxy(state)
          }
        }

        if (prop === "eq" || prop === "neq" || prop === "in" || prop === "like" || prop === "ilike") {
          return (column, value) => {
            state.filters.push({ type: prop, column, value })
            if (state.mutation && column === "id") {
              state.match = { ...(state.match || {}), id: value }
              state.mutation.match = state.match
            }
            state.rawQuery = state.rawQuery[prop](column, value)
            return createQueryProxy(state)
          }
        }

        if (prop === "not") {
          return (column, operator, value) => {
            state.filters.push({ type: "not", column, operator, value })
            state.rawQuery = state.rawQuery.not(column, operator, value)
            return createQueryProxy(state)
          }
        }

        if (prop === "or") {
          return (expression) => {
            state.orFilters.push(expression)
            state.rawQuery = state.rawQuery.or(expression)
            return createQueryProxy(state)
          }
        }

        if (prop === "order") {
          return (column, options = {}) => {
            state.orders.push({ column, ascending: options.ascending !== false })
            state.rawQuery = state.rawQuery.order(column, options)
            return createQueryProxy(state)
          }
        }

        if (prop === "limit") {
          return (value) => {
            state.limitValue = value
            state.rawQuery = state.rawQuery.limit(value)
            return createQueryProxy(state)
          }
        }

        if (prop === "match") {
          return (value) => {
            if (value?.id) {
              state.match = { ...(state.match || {}), id: value.id }
            }
            state.rawQuery = state.rawQuery.match(value)
            return createQueryProxy(state)
          }
        }

        if (typeof state.rawQuery?.[prop] === "function") {
          return (...args) => {
            state.rawQuery = state.rawQuery[prop](...args)
            return createQueryProxy(state)
          }
        }

        const value = state.rawQuery?.[prop]
        return typeof value === "function" ? value.bind(state.rawQuery) : value
      },
    },
  )
}

export function createSupabaseService(rawClient) {
  setRawSupabaseClient(rawClient)

  return new Proxy(rawClient, {
    get(target, prop) {
      if (prop === "from") {
        return (table) =>
          createQueryProxy({
            table,
            rawQuery: rawClient.from(table),
            mutation: null,
            match: null,
            filters: [],
            orFilters: [],
            orders: [],
            limitValue: null,
            expectSingle: false,
            singleRequired: false,
            selectColumns: "*",
            selectOptions: {},
            selectCalled: false,
          })
      }

      const value = target[prop]
      return typeof value === "function" ? value.bind(target) : value
    },
  })
}

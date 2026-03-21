const OFFLINE_QUEUE_KEY = "offlineQueue"
const OFFLINE_CACHE_KEY = "offlineCache"
const OFFLINE_EVENT_NAME = "offline-service:update"
const DB_NAME = "scoops_offline_db"
const DB_VERSION = 1
const QUEUE_STORE = "queue"
const CACHE_STORE = "cache"

let rawClient = null
let syncInProgress = false
let syncErrorMessage = ""
let syncProcessed = 0
let syncTotal = 0

function canUseWindow() {
  return typeof window !== "undefined"
}

function canUseIndexedDb() {
  return canUseWindow() && typeof window.indexedDB !== "undefined"
}

function canUseStorage() {
  return canUseWindow() && typeof window.localStorage !== "undefined"
}

function readJson(key, fallback) {
  if (!canUseStorage()) return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    return fallback
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function createUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.random() * 16 | 0
    const value = char === "x" ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function emitState() {
  if (!canUseWindow()) return

  window.dispatchEvent(
    new CustomEvent(OFFLINE_EVENT_NAME, {
      detail: getOfflineState(),
    }),
  )
}

function openDb() {
  if (!canUseIndexedDb()) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "table" })
      }
    }
  })
}

async function idbGetAll(storeName) {
  const db = await openDb()
  if (!db) return null

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

async function idbGet(storeName, key) {
  const db = await openDb()
  if (!db) return null

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly")
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

async function idbPut(storeName, value) {
  const db = await openDb()
  if (!db) return false

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    const request = store.put(value)
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

async function idbDelete(storeName, key) {
  const db = await openDb()
  if (!db) return false

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

async function idbClear(storeName) {
  const db = await openDb()
  if (!db) return false

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite")
    const store = tx.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => resolve(true)
    request.onerror = () => reject(request.error)
  })
}

function normalizeQueueAction(action) {
  const actionType = action.action || action.type
  const isInsert = actionType === "insert"
  const payload = isInsert ? createOfflineRecord(action.data, action.table?.toUpperCase()) : { ...(action.data || {}) }

  return {
    id: action.id || createUuid(),
    table: action.table,
    action: actionType,
    data: payload,
    localData: action.localData || payload,
    match: action.match || { id: payload.id || action.data?.id },
    created_at: action.created_at || action.createdAt || new Date().toISOString(),
    retryCount: action.retryCount || 0,
  }
}

async function writeQueue(queue) {
  writeJson(OFFLINE_QUEUE_KEY, queue)

  if (canUseIndexedDb()) {
    await idbClear(QUEUE_STORE)
    await Promise.all(queue.map((item) => idbPut(QUEUE_STORE, item)))
  }
}

async function writeCache(cache) {
  writeJson(OFFLINE_CACHE_KEY, cache)
  const entries = Object.entries(cache).map(([table, rows]) => ({ table, rows }))

  if (canUseIndexedDb()) {
    await idbClear(CACHE_STORE)
    await Promise.all(entries.map((entry) => idbPut(CACHE_STORE, entry)))
  }
}

function mergeRecord(list, record) {
  const next = Array.isArray(list) ? [...list] : []
  const index = next.findIndex((item) => String(item?.id) === String(record?.id))

  if (index >= 0) {
    next[index] = { ...next[index], ...record }
  } else {
    next.unshift(record)
  }

  return next
}

function removeRecord(list, id) {
  return (Array.isArray(list) ? list : []).filter((item) => String(item?.id) !== String(id))
}

function applyQueuedActions(rows, table, queue) {
  const pending = queue.filter((item) => item.table === table)
  let nextRows = Array.isArray(rows) ? [...rows] : []

  for (const item of pending) {
    const localRecord = item.localData || item.data
    const targetId = item.match?.id || localRecord?.id

    if (item.action === "insert") {
      nextRows = mergeRecord(nextRows, localRecord)
      continue
    }

    if (item.action === "update" && targetId) {
      const current = nextRows.find((row) => String(row?.id) === String(targetId)) || { id: targetId }
      nextRows = mergeRecord(nextRows, { ...current, ...localRecord, id: targetId })
      continue
    }

    if (item.action === "delete" && targetId) {
      nextRows = removeRecord(nextRows, targetId)
    }
  }

  return nextRows
}

function applyOfflineMutation(table, action, data, queue) {
  const cache = getCachedTableDataSync(table)

  if (action === "insert") {
    return mergeRecord(cache, data)
  }

  if (action === "update") {
    return applyQueuedActions(cache, table, [
      ...queue,
      { table, action: "update", localData: data, match: { id: data.id } },
    ])
  }

  if (action === "delete") {
    return removeRecord(cache, data?.id)
  }

  return cache
}

export function setRawSupabaseClient(client) {
  rawClient = client
}

export function getRawSupabaseClient() {
  return rawClient
}

export function isOfflineMode() {
  if (typeof navigator === "undefined") return false
  return !navigator.onLine
}

export async function getQueue() {
  if (canUseIndexedDb()) {
    const items = await idbGetAll(QUEUE_STORE)
    if (items) return items.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }

  return readJson(OFFLINE_QUEUE_KEY, [])
}

function getQueueSync() {
  return readJson(OFFLINE_QUEUE_KEY, [])
}

export function getOfflineState() {
  const queue = getQueueSync()

  return {
    isOnline: !isOfflineMode(),
    isSyncing: syncInProgress,
    queueLength: queue.length,
    syncError: syncErrorMessage,
    syncProcessed,
    syncTotal,
  }
}

export async function cacheTableData(table, rows) {
  const cache = await getCacheMap()
  cache[table] = Array.isArray(rows) ? rows : []
  await writeCache(cache)
  emitState()
}

async function getCacheMap() {
  if (canUseIndexedDb()) {
    const entries = await idbGetAll(CACHE_STORE)
    if (entries) {
      return entries.reduce((acc, entry) => {
        acc[entry.table] = entry.rows || []
        return acc
      }, {})
    }
  }

  return readJson(OFFLINE_CACHE_KEY, {})
}

function getCacheMapSync() {
  return readJson(OFFLINE_CACHE_KEY, {})
}

export function getCachedTableData(table) {
  const cache = getCacheMapSync()
  const queue = getQueueSync()
  return applyQueuedActions(cache[table] || [], table, queue)
}

function getCachedTableDataSync(table) {
  const cache = getCacheMapSync()
  const queue = getQueueSync()
  return applyQueuedActions(cache[table] || [], table, queue)
}

export function createOfflineRecord(data = {}, prefix = "OFFLINE") {
  return {
    ...data,
    id: data.id || createUuid(),
    offline_ref: data.offline_ref || `${prefix}-${Date.now().toString(36)}`,
  }
}

export async function addToQueue(action) {
  const queue = await getQueue()
  const normalizedAction = normalizeQueueAction(action)
  const targetId = String(normalizedAction.match?.id || normalizedAction.data?.id || "")
  const nextQueue = [...queue]
  const existingIndex = nextQueue.findIndex(
    (item) =>
      item.table === normalizedAction.table &&
      String(item.match?.id || item.data?.id || "") === targetId,
  )

  if (existingIndex >= 0) {
    const existing = nextQueue[existingIndex]

    if (normalizedAction.action === "delete" && existing.action === "insert") {
      nextQueue.splice(existingIndex, 1)
    } else if (normalizedAction.action === "update" && existing.action === "insert") {
      nextQueue[existingIndex] = {
        ...existing,
        data: { ...existing.data, ...normalizedAction.data },
        localData: { ...existing.localData, ...normalizedAction.localData },
      }
    } else if (normalizedAction.action === existing.action || normalizedAction.action === "update") {
      nextQueue[existingIndex] = {
        ...existing,
        ...normalizedAction,
        data: { ...existing.data, ...normalizedAction.data },
        localData: { ...existing.localData, ...normalizedAction.localData },
      }
    } else {
      nextQueue.push(normalizedAction)
    }
  } else {
    nextQueue.push(normalizedAction)
  }

  await writeQueue(nextQueue)

  const nextCache = await getCacheMap()
  nextCache[normalizedAction.table] = applyQueuedActions(
    nextCache[normalizedAction.table] || [],
    normalizedAction.table,
    [normalizedAction],
  )
  await writeCache(nextCache)

  console.log("[offlineService] offline save", normalizedAction)
  emitState()
  return normalizedAction
}

export async function clearQueue() {
  await writeQueue([])
  syncErrorMessage = ""
  syncProcessed = 0
  syncTotal = 0
  emitState()
}

async function updateCacheAfterSync(action, syncedRow) {
  const cache = await getCacheMap()
  const currentRows = Array.isArray(cache[action.table]) ? cache[action.table] : []
  const targetId = action.match?.id || action.data?.id

  if (action.action === "delete") {
    cache[action.table] = removeRecord(currentRows, targetId)
  } else if (syncedRow) {
    cache[action.table] = mergeRecord(removeRecord(currentRows, targetId), syncedRow)
  }

  await writeCache(cache)
}

function buildOptimisticResponse(action) {
  const row = action.localData || action.data
  if (action.action === "delete") {
    return { data: null, error: null }
  }

  return { data: row, error: null }
}

export async function executeMutation({ table, action, data, match }) {
  if (!table || !action) {
    throw new Error("Offline mutation requires table and action")
  }

  if (isOfflineMode()) {
    if (action === "insert" && Array.isArray(data)) {
      const queuedItems = []

      for (const row of data) {
        const queued = await addToQueue({
          table,
          action,
          data: row,
          match: { id: row?.id },
          localData: row,
        })
        queuedItems.push(queued.localData || queued.data)
      }

      return { data: queuedItems, error: null }
    }

    const payload = action === "delete" ? { id: match?.id || data?.id } : data
    const queued = await addToQueue({
      table,
      action,
      data: payload,
      match,
      localData: action === "delete" ? { id: match?.id || data?.id } : payload,
    })

    return buildOptimisticResponse(queued)
  }

  if (!rawClient) {
    throw new Error("Supabase client not configured")
  }

  console.log("[offlineService] syncing", { table, action, data, match })
  const query = rawClient.from(table)

  if (action === "insert") {
    return query.insert(Array.isArray(data) ? data : [data]).select()
  }

  if (action === "update") {
    let updateQuery = query.update(data)
    if (match?.id || data?.id) updateQuery = updateQuery.eq("id", match?.id || data?.id)
    return updateQuery.select()
  }

  if (action === "delete") {
    let deleteQuery = query.delete()
    if (match?.id || data?.id) deleteQuery = deleteQuery.eq("id", match?.id || data?.id)
    return deleteQuery
  }

  throw new Error(`Unsupported action: ${action}`)
}

async function syncAction(action) {
  if (!rawClient) {
    throw new Error("Supabase client not configured")
  }

  const table = rawClient.from(action.table)

  if (action.action === "insert") {
    const payload = { ...action.data }
    const { data, error } = await table.upsert([payload], { onConflict: "id" }).select()
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
  }

  if (action.action === "update") {
    const targetId = action.match?.id || action.data?.id
    const { data, error } = await table.update(action.data).eq("id", targetId).select()
    if (error) throw error
    return Array.isArray(data) ? data[0] : data
  }

  if (action.action === "delete") {
    const targetId = action.match?.id || action.data?.id
    const { error } = await table.delete().eq("id", targetId)
    if (error) throw error
    return null
  }

  throw new Error(`Unsupported offline action type: ${action.action}`)
}

export async function syncQueue() {
  const queue = await getQueue()

  if (isOfflineMode()) {
    return { synced: 0, failed: queue.length }
  }

  if (syncInProgress) {
    return { synced: 0, failed: queue.length }
  }

  if (!queue.length) {
    syncErrorMessage = ""
    syncProcessed = 0
    syncTotal = 0
    emitState()
    return { synced: 0, failed: 0 }
  }

  syncInProgress = true
  syncErrorMessage = ""
  syncProcessed = 0
  syncTotal = queue.length
  emitState()

  let synced = 0
  const remaining = []

  try {
    for (const item of queue) {
      try {
        console.log("[offlineService] syncing", item)
        const syncedRow = await syncAction(item)
        synced += 1
        syncProcessed = synced
        await updateCacheAfterSync(item, syncedRow)
        console.log("[offlineService] sync success", item)
      } catch (error) {
        remaining.push({
          ...item,
          retryCount: (item.retryCount || 0) + 1,
          lastError: error?.message || "Sync failed",
        })
        syncErrorMessage = error?.message || "Certaines synchronisations ont échoué"
        console.log("[offlineService] sync error", item, error)
      } finally {
        emitState()
      }
    }

    await writeQueue(remaining)
    return { synced, failed: remaining.length }
  } finally {
    syncInProgress = false
    emitState()
  }
}

export function subscribeOfflineState(callback) {
  if (!canUseWindow()) return () => {}

  const handler = (event) => {
    callback(event.detail || getOfflineState())
  }

  window.addEventListener(OFFLINE_EVENT_NAME, handler)
  callback(getOfflineState())

  return () => {
    window.removeEventListener(OFFLINE_EVENT_NAME, handler)
  }
}

export async function getCachedRow(table, id) {
  const rows = getCachedTableData(table)
  return rows.find((row) => String(row?.id) === String(id)) || null
}

export async function getCachedEntry(table) {
  if (canUseIndexedDb()) {
    const entry = await idbGet(CACHE_STORE, table)
    return entry?.rows || []
  }

  const cache = getCacheMapSync()
  return cache[table] || []
}

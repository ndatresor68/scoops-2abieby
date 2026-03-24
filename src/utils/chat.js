import { supabase } from "../supabaseClient"

export const CHAT_AUDIO_BUCKET = "chat-audio"

function sortByCreatedAtAsc(items) {
  return [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

export function mergeMessage(list, message) {
  if (!message?.id) return list
  const index = list.findIndex((item) => item.id === message.id)
  if (index === -1) {
    return sortByCreatedAtAsc([...list, message])
  }

  const nextList = [...list]
  nextList[index] = { ...nextList[index], ...message }
  return sortByCreatedAtAsc(nextList)
}

export async function fetchChatContacts(currentUserId, canSeeAllUsers = false) {
  let query = supabase
    .from("utilisateurs")
    .select("id, nom, email, role, status")
    .neq("id", currentUserId)
    .order("nom", { ascending: true })

  if (!canSeeAllUsers) {
    query = query.in("role", ["ADMIN", "AGENT", "CENTRE"])
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).filter((item) => item.status !== "banned")
}

export async function fetchConversationMessages(currentUserId, otherUserId) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
    )
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

export async function sendTextMessage({ senderId, receiverId, message }) {
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        sender_id: senderId,
        receiver_id: receiverId,
        message: String(message || "").trim(),
      },
    ])
    .select("*")
    .single()

  if (error) throw error
  return data
}

function isMissingMessageStatusColumnError(error) {
  const content = String(error?.message || "").toLowerCase()
  return content.includes("column") && (content.includes("read_at") || content.includes("delivered_at"))
}

export async function sendAudioMessage({ senderId, receiverId, audioBlob }) {
  const filePath = `${senderId}/${receiverId}/${Date.now()}.webm`
  const { error: uploadError } = await supabase.storage
    .from(CHAT_AUDIO_BUCKET)
    .upload(filePath, audioBlob, {
      cacheControl: "3600",
      contentType: audioBlob.type || "audio/webm",
      upsert: false,
    })

  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        sender_id: senderId,
        receiver_id: receiverId,
        audio_url: filePath,
      },
    ])
    .select("*")
    .single()

  if (error) throw error
  return data
}

export async function getAudioPlaybackUrl(path) {
  if (!path) return ""
  if (/^https?:\/\//i.test(path)) return path

  const { data, error } = await supabase.storage.from(CHAT_AUDIO_BUCKET).createSignedUrl(path, 3600)
  if (error) throw error
  return data?.signedUrl || ""
}

export async function markConversationDelivered(currentUserId, otherUserId) {
  try {
    const { error } = await supabase
      .from("messages")
      .update({ delivered_at: new Date().toISOString() })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", currentUserId)
      .is("delivered_at", null)

    if (error) {
      if (isMissingMessageStatusColumnError(error)) {
        console.warn("[chat] delivered_at column unavailable, skipping delivered status.")
        return { success: false, missingColumn: true }
      }
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("[chat] markConversationDelivered error:", error)
    return { success: false, error }
  }
}

export async function markConversationSeen(currentUserId, otherUserId) {
  const timestamp = new Date().toISOString()
  try {
    const { error } = await supabase
      .from("messages")
      .update({ delivered_at: timestamp, read_at: timestamp })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", currentUserId)
      .is("read_at", null)

    if (error) {
      if (isMissingMessageStatusColumnError(error)) {
        console.warn("[chat] read_at/delivered_at columns unavailable, skipping seen status.")
        return { success: false, missingColumn: true }
      }
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error("[chat] markConversationSeen error:", error)
    return { success: false, error }
  }
}

export function subscribeToUserMessages(currentUserId, handlers) {
  const onInsert = typeof handlers === "function" ? handlers : handlers?.onInsert
  const onUpdate = typeof handlers === "function" ? null : handlers?.onUpdate

  const channel = supabase
    .channel(`messages:${currentUserId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const nextMessage = payload.new
        if (!nextMessage) return
        if (nextMessage.sender_id !== currentUserId && nextMessage.receiver_id !== currentUserId) return
        onInsert?.(nextMessage)
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const nextMessage = payload.new
        if (!nextMessage) return
        if (nextMessage.sender_id !== currentUserId && nextMessage.receiver_id !== currentUserId) return
        onUpdate?.(nextMessage)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToChatPresence(currentUser, onPresenceChange) {
  if (!currentUser?.id) return () => {}

  const channel = supabase.channel("chat-presence", {
    config: {
      presence: {
        key: currentUser.id,
      },
    },
  })

  const syncPresence = () => {
    const state = channel.presenceState()
    const onlineUserIds = Object.keys(state || {})
    onPresenceChange?.(onlineUserIds)
  }

  channel
    .on("presence", { event: "sync" }, syncPresence)
    .on("presence", { event: "join" }, syncPresence)
    .on("presence", { event: "leave" }, syncPresence)
    .subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return

      await channel.track({
        user_id: currentUser.id,
        online_at: new Date().toISOString(),
      })
    })

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported"
  }

  if (window.Notification.permission === "granted") {
    return "granted"
  }

  if (window.Notification.permission === "denied") {
    return "denied"
  }

  return window.Notification.requestPermission()
}

export function showChatBrowserNotification({ title, body }) {
  if (typeof window === "undefined" || !("Notification" in window)) return null
  if (window.Notification.permission !== "granted") return null

  const notification = new window.Notification(title || "Nouveau message", {
    body: body || "Vous avez reçu un nouveau message.",
    silent: false,
    tag: `chat-${Date.now()}`,
  })

  notification.onclick = () => {
    window.focus()
    notification.close()
  }

  return notification
}

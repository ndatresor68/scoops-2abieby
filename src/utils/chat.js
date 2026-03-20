import { supabase } from "../supabaseClient"

export const CHAT_AUDIO_BUCKET = "chat-audio"

function sortByCreatedAtAsc(items) {
  return [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

export function mergeMessage(list, message) {
  if (!message?.id) return list
  const exists = list.some((item) => item.id === message.id)
  return exists ? list : sortByCreatedAtAsc([...list, message])
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

export function subscribeToUserMessages(currentUserId, callback) {
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
        callback(nextMessage)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FaArrowLeft,
  FaCheck,
  FaCheckDouble,
  FaComments,
  FaMicrophone,
  FaPaperPlane,
  FaSearch,
  FaStop,
  FaUserCircle,
} from "react-icons/fa"
import { useToast } from "../components/ui/Toast"
import { useMediaQuery } from "../hooks/useMediaQuery"
import { supabase } from "../supabaseClient"
import { CHAT_RECEIVE_SOUND, CHAT_SEND_SOUND } from "../utils/chatSounds"
import {
  fetchChatContacts,
  fetchConversationMessages,
  getAudioPlaybackUrl,
  markConversationDelivered,
  markConversationSeen,
  mergeMessage,
  requestBrowserNotificationPermission,
  sendAudioMessage,
  sendTextMessage,
  showChatBrowserNotification,
  subscribeToChatPresence,
  subscribeToUserMessages,
} from "../utils/chat"

function getContactName(contact) {
  return contact?.nom || contact?.email?.split("@")[0] || "Utilisateur"
}

function getContactSubtitle(contact) {
  const roleLabel = contact?.role || "MEMBRE"
  return contact?.email ? `${roleLabel} · ${contact.email}` : roleLabel
}

function formatTimestamp(dateString) {
  if (!dateString) return ""
  return new Date(dateString).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatConversationDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  if (isToday) return formatTimestamp(dateString)
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
}

function formatDayLabel(dateString) {
  if (!dateString) return ""
  return new Date(dateString).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function getMessagePreview(message) {
  if (message?.message?.trim()) return message.message.trim()
  if (message?.audio_url) return "Message audio"
  return "Conversation"
}

function buildConversationMeta(rows, currentUserId) {
  const meta = new Map()

  for (const row of rows || []) {
    const contactId = row.sender_id === currentUserId ? row.receiver_id : row.sender_id
    if (!contactId) continue

    const currentMeta = meta.get(contactId) || {
      lastMessageAt: null,
      lastPreview: "Aucun message",
      unreadCount: 0,
    }

    if (!currentMeta.lastMessageAt) {
      currentMeta.lastMessageAt = row.created_at
      currentMeta.lastPreview = getMessagePreview(row)
    }

    if (row.receiver_id === currentUserId && !row.read_at) {
      currentMeta.unreadCount += 1
    }

    meta.set(contactId, currentMeta)
  }

  return meta
}

function isSameDay(left, right) {
  if (!left || !right) return false
  return new Date(left).toDateString() === new Date(right).toDateString()
}

function isGroupedMessage(previousMessage, nextMessage) {
  if (!previousMessage || !nextMessage) return false
  if (previousMessage.sender_id !== nextMessage.sender_id) return false
  const delta = new Date(nextMessage.created_at).getTime() - new Date(previousMessage.created_at).getTime()
  return delta < 5 * 60 * 1000 && isSameDay(previousMessage.created_at, nextMessage.created_at)
}

function getMessageStatus(messageItem) {
  if (messageItem.read_at) {
    return { label: "Vu", icon: <FaCheckDouble />, color: "#38bdf8" }
  }
  if (messageItem.delivered_at) {
    return { label: "Distribué", icon: <FaCheckDouble />, color: "rgba(255,255,255,0.9)" }
  }
  return { label: "Envoyé", icon: <FaCheck />, color: "rgba(255,255,255,0.82)" }
}

function withUpdatedConversationMeta(currentContacts, nextMessage, currentUserId) {
  const contactId = nextMessage.sender_id === currentUserId ? nextMessage.receiver_id : nextMessage.sender_id
  if (!contactId) return currentContacts

  const nextContacts = currentContacts.map((contact) => {
    if (contact.id !== contactId) return contact

    const currentMeta = contact.conversationMeta || {}
    const isUnread = nextMessage.receiver_id === currentUserId && !nextMessage.read_at

    return {
      ...contact,
      conversationMeta: {
        ...currentMeta,
        lastMessageAt: nextMessage.created_at,
        lastPreview: getMessagePreview(nextMessage),
        unreadCount: isUnread ? (currentMeta.unreadCount || 0) + 1 : currentMeta.unreadCount || 0,
      },
    }
  })

  return nextContacts.sort((left, right) => {
    const leftDate = left.conversationMeta?.lastMessageAt ? new Date(left.conversationMeta.lastMessageAt).getTime() : 0
    const rightDate = right.conversationMeta?.lastMessageAt ? new Date(right.conversationMeta.lastMessageAt).getTime() : 0
    if (leftDate !== rightDate) return rightDate - leftDate
    return getContactName(left).localeCompare(getContactName(right), "fr", { sensitivity: "base" })
  })
}

const CHAT_ANIMATIONS = `
@keyframes chat-bubble-float {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(-240px) scale(1.14); opacity: 0; }
}
@keyframes whale-drift {
  0% { transform: translateX(-18%) translateY(0); }
  50% { transform: translateX(12%) translateY(12px); }
  100% { transform: translateX(34%) translateY(-6px); }
}
@keyframes shark-pass {
  0% { transform: translateX(120%) translateY(0); opacity: 0; }
  15% { opacity: 0.14; }
  85% { opacity: 0.1; }
  100% { transform: translateX(-130%) translateY(10px); opacity: 0; }
}
`

export default function Chat({ adminMode = false }) {
  const { showToast } = useToast()
  const isMobile = useMediaQuery("(max-width: 900px)")
  const scrollRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const selectedContactRef = useRef(null)
  const contactsRef = useRef([])
  const sendSoundRef = useRef(null)
  const receiveSoundRef = useRef(null)
  const soundEnabledRef = useRef(false)
  const lastSoundAtRef = useRef({ send: 0, receive: 0 })

  const [currentUser, setCurrentUser] = useState(null)
  const [contacts, setContacts] = useState([])
  const [contactsLoading, setContactsLoading] = useState(true)
  const [selectedContact, setSelectedContact] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [audioUrls, setAudioUrls] = useState({})
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [search, setSearch] = useState("")
  const [onlineUserIds, setOnlineUserIds] = useState([])
  const [notificationPermission, setNotificationPermission] = useState("default")

  const supportsAudioRecording =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"

  const selectedConversationId = selectedContact?.id || null

  const filteredContacts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return contacts

    return contacts.filter((contact) => {
      const preview = contact.conversationMeta?.lastPreview || ""
      const haystack = `${getContactName(contact)} ${contact?.email || ""} ${contact?.role || ""} ${preview}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [contacts, search])

  const decoratedMessages = useMemo(() => {
    return messages.map((messageItem, index) => {
      const previous = messages[index - 1]
      return {
        ...messageItem,
        showDayDivider: index === 0 || !isSameDay(previous?.created_at, messageItem.created_at),
        compact: isGroupedMessage(previous, messageItem),
      }
    })
  }, [messages])

  const onlineUsersSet = useMemo(() => new Set(onlineUserIds), [onlineUserIds])
  const selectedContactOnline = selectedContact ? onlineUsersSet.has(selectedContact.id) : false

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!cancelled) {
          setCurrentUser(authUser || null)
        }
      } catch (error) {
        console.error("[Chat] Failed to get current user:", error)
        if (!cancelled) {
          setCurrentUser(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    selectedContactRef.current = selectedContact
  }, [selectedContact])

  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  useEffect(() => {
    let active = true

    ;(async () => {
      const permission = await requestBrowserNotificationPermission()
      if (active) {
        setNotificationPermission(permission)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return undefined

    sendSoundRef.current = new window.Audio(CHAT_SEND_SOUND)
    receiveSoundRef.current = new window.Audio(CHAT_RECEIVE_SOUND)
    sendSoundRef.current.preload = "auto"
    receiveSoundRef.current.preload = "auto"

    const unlockSounds = () => {
      soundEnabledRef.current = true
    }

    window.addEventListener("pointerdown", unlockSounds, { once: true })
    window.addEventListener("keydown", unlockSounds, { once: true })

    return () => {
      window.removeEventListener("pointerdown", unlockSounds)
      window.removeEventListener("keydown", unlockSounds)
      if (sendSoundRef.current) {
        sendSoundRef.current.pause()
        sendSoundRef.current = null
      }
      if (receiveSoundRef.current) {
        receiveSoundRef.current.pause()
        receiveSoundRef.current = null
      }
    }
  }, [])

  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return

    setContactsLoading(true)

    try {
      const [allContacts, messagesRes] = await Promise.all([
        fetchChatContacts(currentUser.id, adminMode),
        supabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
          .order("created_at", { ascending: false }),
      ])

      if (messagesRes.error) {
        console.error("[Chat] loadConversations messages error:", messagesRes.error)
        throw messagesRes.error
      }

      const conversationMeta = buildConversationMeta(messagesRes.data || [], currentUser.id)

      const nextContacts = [...allContacts]
        .map((contact) => ({
          ...contact,
          conversationMeta: conversationMeta.get(contact.id) || {
            lastMessageAt: null,
            lastPreview: "Démarrer une conversation",
            unreadCount: 0,
          },
        }))
        .sort((left, right) => {
          const leftDate = left.conversationMeta?.lastMessageAt
            ? new Date(left.conversationMeta.lastMessageAt).getTime()
            : 0
          const rightDate = right.conversationMeta?.lastMessageAt
            ? new Date(right.conversationMeta.lastMessageAt).getTime()
            : 0

          if (leftDate !== rightDate) return rightDate - leftDate
          return getContactName(left).localeCompare(getContactName(right), "fr", { sensitivity: "base" })
        })

      setContacts(nextContacts)
      setSelectedContact((current) => {
        if (current?.id) {
          const matched = nextContacts.find((entry) => entry.id === current.id)
          if (matched) return matched
        }
        return nextContacts[0] || null
      })
    } catch (error) {
      console.error("[Chat] loadConversations failed:", error)
      showToast("Impossible de charger les conversations.", "error")
    } finally {
      setContactsLoading(false)
    }
  }, [adminMode, currentUser?.id, showToast])

  const loadMessages = useCallback(async () => {
    if (!currentUser?.id || !selectedContact?.id) {
      setMessages([])
      return
    }

    setMessagesLoading(true)
    try {
      const data = await fetchConversationMessages(currentUser.id, selectedContact.id)
      console.log("[Chat] messages loaded:", data)
      setMessages(data)
    } catch (error) {
      console.error("[Chat] loadMessages failed:", error)
      showToast("Impossible de charger les messages.", "error")
    } finally {
      setMessagesLoading(false)
    }
  }, [currentUser?.id, selectedContact?.id, showToast])

  const syncSeenState = useCallback(async () => {
    const contactId = selectedContactRef.current?.id
    if (!currentUser?.id || !contactId) return

    await markConversationDelivered(currentUser.id, contactId)

    if (typeof document === "undefined" || document.visibilityState === "visible") {
      await markConversationSeen(currentUser.id, contactId)
      setContacts((current) =>
        current.map((contact) =>
          contact.id === contactId
            ? {
                ...contact,
                conversationMeta: {
                  ...contact.conversationMeta,
                  unreadCount: 0,
                },
              }
            : contact,
        ),
      )
    }
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser?.id) return
    loadConversations()
  }, [currentUser?.id, loadConversations])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!currentUser?.id) return undefined
    return subscribeToChatPresence(currentUser, (nextOnlineUserIds) => {
      setOnlineUserIds(nextOnlineUserIds)
    })
  }, [currentUser])

  useEffect(() => {
    if (!currentUser?.id) return undefined

    return subscribeToUserMessages(currentUser.id, {
      onInsert: async (nextMessage) => {
        console.log("[Chat] realtime insert:", nextMessage)
        const currentContactId = selectedContactRef.current?.id
        const isIncoming = nextMessage.receiver_id === currentUser.id
        const belongsToCurrentConversation =
          currentContactId &&
          ((nextMessage.sender_id === currentUser.id && nextMessage.receiver_id === currentContactId) ||
            (nextMessage.receiver_id === currentUser.id && nextMessage.sender_id === currentContactId))

        if (belongsToCurrentConversation) {
          setMessages((current) => mergeMessage(current, nextMessage))
        }

        setContacts((current) => withUpdatedConversationMeta(current, nextMessage, currentUser.id))

        if (isIncoming) {
          await markConversationDelivered(currentUser.id, nextMessage.sender_id)

          const isVisibleConversation =
            (typeof document === "undefined" || document.visibilityState === "visible") &&
            selectedContactRef.current?.id === nextMessage.sender_id

          if (isVisibleConversation) {
            await markConversationSeen(currentUser.id, nextMessage.sender_id)
          } else {
            const senderName =
              contactsRef.current.find((item) => item.id === nextMessage.sender_id)?.nom || "Nouveau message"
            playChatSound("receive")
            showChatBrowserNotification({
              title: senderName,
              body: getMessagePreview(nextMessage),
            })
          }
        }
      },
      onUpdate: (nextMessage) => {
        console.log("[Chat] realtime update:", nextMessage)
        setMessages((current) => mergeMessage(current, nextMessage))
        setContacts((current) =>
          current.map((contact) => {
            const unreadCount =
              contact.id === nextMessage.sender_id && nextMessage.receiver_id === currentUser.id && nextMessage.read_at
                ? 0
                : contact.conversationMeta?.unreadCount || 0

            return {
              ...contact,
              conversationMeta: {
                ...contact.conversationMeta,
                unreadCount,
              },
            }
          }),
        )
      },
    })
  }, [currentUser?.id])

  useEffect(() => {
    if (!messages.length) return

    const missingAudio = messages.filter((item) => item.audio_url && !audioUrls[item.audio_url])
    if (!missingAudio.length) return

    let cancelled = false

    ;(async () => {
      try {
        const resolved = await Promise.all(
          missingAudio.map(async (item) => [item.audio_url, await getAudioPlaybackUrl(item.audio_url)]),
        )

        if (!cancelled) {
          setAudioUrls((current) => ({
            ...current,
            ...Object.fromEntries(resolved),
          }))
        }
      } catch (error) {
        console.error("[Chat] audio load failed:", error)
        showToast("Impossible de charger un message audio.", "error")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [audioUrls, messages, showToast])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, messagesLoading, selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) return
    syncSeenState()
  }, [selectedConversationId, syncSeenState])

  useEffect(() => {
    const handleFocus = () => {
      syncSeenState()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncSeenState()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [syncSeenState])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  async function handleSendMessage() {
    if (!currentUser?.id || !selectedContact?.id) return
    const trimmedDraft = draft.trim()
    if (!trimmedDraft || sending) return

    setSending(true)
    try {
      const nextMessage = await sendTextMessage({
        senderId: currentUser.id,
        receiverId: selectedContact.id,
        message: trimmedDraft,
      })

      console.log("[Chat] send text success:", nextMessage)
      setMessages((current) => mergeMessage(current, nextMessage))
      setContacts((current) => withUpdatedConversationMeta(current, nextMessage, currentUser.id))
      setDraft("")
      playChatSound("send")
    } catch (error) {
      console.error("[Chat] send text failed:", error)
      showToast("Envoi du message impossible.", "error")
    } finally {
      setSending(false)
    }
  }

  async function startRecording() {
    if (!supportsAudioRecording || !currentUser?.id || !selectedConversationId) {
      showToast("Enregistrement audio indisponible.", "warning")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new window.MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        mediaRecorderRef.current = null
        setRecording(false)

        if (!audioBlob.size) return

        setSending(true)
        try {
          const nextMessage = await sendAudioMessage({
            senderId: currentUser.id,
            receiverId: selectedConversationId,
            audioBlob,
          })

          console.log("[Chat] send audio success:", nextMessage)
          setMessages((current) => mergeMessage(current, nextMessage))
          setContacts((current) => withUpdatedConversationMeta(current, nextMessage, currentUser.id))
          playChatSound("send", 80)
        } catch (error) {
          console.error("[Chat] send audio failed:", error)
          showToast("Envoi du message audio impossible.", "error")
        } finally {
          setSending(false)
        }
      }

      mediaRecorderRef.current = { recorder, stream }
      recorder.start()
      setRecording(true)
    } catch (error) {
      console.error("[Chat] microphone access denied:", error)
      showToast("Accès au micro refusé.", "error")
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.recorder?.stop()
  }

  function playChatSound(type, delay = 0) {
    if (!soundEnabledRef.current || typeof window === "undefined") return

    const now = Date.now()
    const cooldown = type === "send" ? 250 : 500
    if (now - (lastSoundAtRef.current[type] || 0) < cooldown) {
      return
    }

    lastSoundAtRef.current[type] = now
    const targetAudio = type === "send" ? sendSoundRef.current : receiveSoundRef.current
    if (!targetAudio) return

    window.setTimeout(() => {
      try {
        targetAudio.currentTime = 0
        const playPromise = targetAudio.play()
        if (playPromise?.catch) {
          playPromise.catch((error) => {
            console.warn(`[Chat] ${type} sound blocked:`, error)
          })
        }
      } catch (error) {
        console.warn(`[Chat] ${type} sound failed:`, error)
      }
    }, delay)
  }

  function handleSelectContact(contact) {
    setSelectedContact(contact)
    setContacts((current) =>
      current.map((item) =>
        item.id === contact.id
          ? {
              ...item,
              conversationMeta: {
                ...item.conversationMeta,
                unreadCount: 0,
              },
            }
          : item,
      ),
    )
  }

  return (
    <div style={styles.page}>
      <style>{CHAT_ANIMATIONS}</style>

      <div style={styles.headerCard}>
        <div>
          <div style={styles.eyebrow}>{adminMode ? "Admin chat" : "Messagerie"}</div>
          <h1 style={styles.title}>Chat temps réel</h1>
          <p style={styles.subtitle}>
            Discussions fluides, présence en direct, accusés de lecture et ambiance premium inspirée de l’eau.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.headerChip}>{onlineUserIds.length} en ligne</span>
          <span style={styles.headerChipMuted}>
            Notifications {notificationPermission === "granted" ? "activées" : "à autoriser"}
          </span>
        </div>
      </div>

      <div
        style={{
          ...styles.layout,
          ...(isMobile ? styles.layoutMobile : null),
        }}
      >
        {(!isMobile || !selectedContact) && (
          <aside style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <div style={styles.sidebarTitleRow}>
                <FaComments style={{ color: "#0ea5e9" }} />
                <strong>Conversations</strong>
              </div>
              <span style={styles.sidebarBadge}>{filteredContacts.length}</span>
            </div>

            <div style={styles.searchBox}>
              <FaSearch style={{ color: "#94a3b8", flexShrink: 0 }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un utilisateur..."
                style={styles.searchInput}
              />
            </div>

            <div style={styles.contactList}>
              {contactsLoading ? (
                <div style={styles.emptyState}>Chargement des contacts...</div>
              ) : filteredContacts.length ? (
                filteredContacts.map((contact) => {
                  const active = selectedConversationId === contact.id
                  const isOnline = onlineUsersSet.has(contact.id)
                  const unreadCount = contact.conversationMeta?.unreadCount || 0

                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => handleSelectContact(contact)}
                      style={{
                        ...styles.contactItem,
                        ...(active ? styles.contactItemActive : null),
                      }}
                    >
                      <div style={styles.contactAvatarWrap}>
                        <div style={styles.contactAvatar}>
                          <FaUserCircle />
                        </div>
                        <span
                          style={{
                            ...styles.presenceDot,
                            ...styles.presenceDotFloating,
                            ...(isOnline ? styles.presenceOnline : styles.presenceOffline),
                          }}
                        />
                      </div>

                      <div style={styles.contactMeta}>
                        <div style={styles.contactTopRow}>
                          <div style={styles.contactName}>{getContactName(contact)}</div>
                          <div style={styles.contactTime}>
                            {formatConversationDate(contact.conversationMeta?.lastMessageAt)}
                          </div>
                        </div>
                        <div style={styles.contactSubtitle}>{getContactSubtitle(contact)}</div>
                        <div style={styles.contactBottomRow}>
                          <div style={styles.contactPreview}>{contact.conversationMeta?.lastPreview}</div>
                          {unreadCount ? <span style={styles.unreadBadge}>{unreadCount}</span> : null}
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div style={styles.emptyState}>Aucun utilisateur disponible.</div>
              )}
            </div>
          </aside>
        )}

        {(!isMobile || selectedContact) && (
          <section style={styles.chatPanel}>
            {selectedContact ? (
              <>
                <div style={styles.chatHeader}>
                  <div style={styles.chatHeaderInfo}>
                    {isMobile ? (
                      <button type="button" style={styles.backButton} onClick={() => setSelectedContact(null)}>
                        <FaArrowLeft />
                      </button>
                    ) : null}

                    <div style={styles.chatAvatar}>
                      <FaUserCircle />
                    </div>

                    <div style={styles.chatIdentity}>
                      <div style={styles.chatName}>{getContactName(selectedContact)}</div>
                      <div style={styles.chatRoleRow}>
                        <span
                          style={{
                            ...styles.presenceDot,
                            ...(selectedContactOnline ? styles.presenceOnline : styles.presenceOffline),
                          }}
                        />
                        <span style={styles.chatRole}>
                          {selectedContactOnline ? "En ligne" : "Hors ligne"} · {getContactSubtitle(selectedContact)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div ref={scrollRef} style={styles.messageList}>
                  <div style={styles.chatBackdrop}>
                    {[...Array(10)].map((_, index) => (
                      <span
                        key={`bubble-${index}`}
                        style={{
                          ...styles.bubble,
                          left: `${6 + index * 9}%`,
                          animationDuration: `${9 + (index % 4) * 2}s`,
                          animationDelay: `${index * 1.1}s`,
                          width: 16 + (index % 3) * 10,
                          height: 16 + (index % 3) * 10,
                        }}
                      />
                    ))}
                    <div style={styles.whaleSilhouette}>🐋</div>
                    <div style={styles.sharkSilhouette}>🦈</div>
                  </div>

                  {messagesLoading ? (
                    <div style={styles.emptyState}>Chargement des messages...</div>
                  ) : decoratedMessages.length ? (
                    decoratedMessages.map((messageItem) => {
                      const isOwnMessage = messageItem.sender_id === currentUser?.id
                      const audioSrc = messageItem.audio_url ? audioUrls[messageItem.audio_url] : ""
                      const status = isOwnMessage ? getMessageStatus(messageItem) : null

                      return (
                        <div key={messageItem.id}>
                          {messageItem.showDayDivider ? (
                            <div style={styles.dayDivider}>
                              <span style={styles.dayDividerLabel}>{formatDayLabel(messageItem.created_at)}</span>
                            </div>
                          ) : null}

                          <div
                            style={{
                              ...styles.messageRow,
                              justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                              marginTop: messageItem.compact ? 4 : 12,
                            }}
                          >
                            <div
                              style={{
                                ...styles.messageBubble,
                                ...(isOwnMessage ? styles.ownBubble : styles.otherBubble),
                                ...(messageItem.compact
                                  ? isOwnMessage
                                    ? styles.ownBubbleCompact
                                    : styles.otherBubbleCompact
                                  : null),
                              }}
                            >
                              {messageItem.message ? <div>{messageItem.message}</div> : null}
                              {messageItem.audio_url ? (
                                audioSrc ? (
                                  <audio controls preload="none" src={audioSrc} style={styles.audioPlayer} />
                                ) : (
                                  <div style={styles.audioLoading}>Audio...</div>
                                )
                              ) : null}
                              <div style={styles.messageFooter}>
                                <span style={styles.messageTime}>{formatTimestamp(messageItem.created_at)}</span>
                                {status ? (
                                  <span title={status.label} style={{ ...styles.messageStatus, color: status.color }}>
                                    {status.icon}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div style={styles.emptyState}>Commencez cette conversation avec votre premier message.</div>
                  )}
                </div>

                <div style={styles.composer}>
                  <div style={styles.composerShell}>
                    <textarea
                      rows={2}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault()
                          handleSendMessage()
                        }
                      }}
                      placeholder="Écrire un message..."
                      style={styles.textarea}
                    />
                    <div style={styles.composerActions}>
                      {supportsAudioRecording ? (
                        <button
                          type="button"
                          onClick={recording ? stopRecording : startRecording}
                          disabled={sending}
                          style={{
                            ...styles.iconAction,
                            ...(recording ? styles.iconActionRecording : null),
                          }}
                        >
                          {recording ? <FaStop /> : <FaMicrophone />}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleSendMessage}
                        disabled={sending || !draft.trim()}
                        style={styles.sendButton}
                      >
                        <FaPaperPlane />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.blankState}>
                <FaComments size={40} style={{ color: "#0ea5e9" }} />
                <h2 style={styles.blankTitle}>Choisissez une conversation</h2>
                <p style={styles.blankText}>Sélectionnez un membre dans la liste pour commencer à discuter.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: 20,
    width: "100%",
    height: "calc(100vh - 80px)",
    minHeight: "calc(100vh - 80px)",
    minWidth: 0,
    overflow: "hidden",
  },
  headerCard: {
    borderRadius: 24,
    background: "linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(255,255,255,0.96) 52%, rgba(125,211,252,0.18) 100%)",
    border: "1px solid rgba(186, 230, 253, 0.85)",
    padding: "24px 28px",
    boxShadow: "0 18px 40px rgba(14, 116, 144, 0.1)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#0284c7",
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: "clamp(24px, 4vw, 34px)",
    color: "#082f49",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#334155",
    lineHeight: 1.6,
    maxWidth: 720,
  },
  headerMeta: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  headerChip: {
    borderRadius: 999,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.75)",
    color: "#0369a1",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid rgba(125, 211, 252, 0.7)",
  },
  headerChipMuted: {
    borderRadius: 999,
    padding: "10px 14px",
    background: "rgba(255,255,255,0.75)",
    color: "#475569",
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid rgba(226, 232, 240, 0.9)",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 360px) minmax(0, 1fr)",
    gap: 20,
    minHeight: 0,
    height: "100%",
    width: "100%",
    alignItems: "stretch",
    overflow: "hidden",
  },
  layoutMobile: {
    gridTemplateColumns: "1fr",
    gridTemplateRows: "minmax(0, 1fr)",
  },
  sidebar: {
    background: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)",
    display: "grid",
    gridTemplateRows: "auto auto minmax(0, 1fr)",
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 20px 12px",
    borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
  },
  sidebarTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#0f172a",
  },
  sidebarBadge: {
    background: "#e0f2fe",
    color: "#0369a1",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: 16,
    padding: "12px 14px",
    borderRadius: 14,
    background: "#f8fafc",
    border: "1px solid rgba(226, 232, 240, 0.95)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    width: "100%",
    fontSize: 14,
    color: "#0f172a",
  },
  contactList: {
    height: "100%",
    overflowY: "auto",
    padding: "0 12px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minHeight: 0,
  },
  contactItem: {
    border: "1px solid rgba(226, 232, 240, 0.9)",
    background: "#ffffff",
    borderRadius: 18,
    padding: "15px 16px",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    cursor: "pointer",
    textAlign: "left",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
  },
  contactItemActive: {
    background: "linear-gradient(135deg, rgba(239,246,255,0.92) 0%, rgba(255,255,255,1) 100%)",
    borderColor: "rgba(14, 165, 233, 0.4)",
    boxShadow: "0 12px 24px rgba(14, 165, 233, 0.09)",
    transform: "translateY(-1px)",
  },
  contactAvatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    background: "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)",
    color: "#0284c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    flexShrink: 0,
  },
  presenceDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    display: "inline-block",
    border: "2px solid white",
    flexShrink: 0,
  },
  presenceDotFloating: {
    position: "absolute",
    right: -1,
    bottom: -1,
  },
  presenceOnline: {
    background: "#22c55e",
    boxShadow: "0 0 0 4px rgba(34,197,94,0.14)",
  },
  presenceOffline: {
    background: "#94a3b8",
    boxShadow: "0 0 0 4px rgba(148,163,184,0.12)",
  },
  contactMeta: {
    minWidth: 0,
    flex: 1,
    display: "grid",
    gap: 4,
  },
  contactTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  contactBottomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  contactName: {
    color: "#0f172a",
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  contactTime: {
    color: "#94a3b8",
    fontSize: 11,
    flexShrink: 0,
  },
  contactSubtitle: {
    color: "#64748b",
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  contactPreview: {
    color: "#475569",
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    padding: "0 6px",
    borderRadius: 999,
    background: "#0ea5e9",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chatPanel: {
    background: "#ffffff",
    borderRadius: 24,
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)",
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    height: "100%",
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden",
  },
  chatHeader: {
    padding: "18px 20px",
    borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
    background: "rgba(252, 254, 255, 0.92)",
    position: "sticky",
    top: 0,
    zIndex: 3,
    backdropFilter: "blur(10px)",
  },
  chatHeaderInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  chatIdentity: {
    minWidth: 0,
  },
  chatRoleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid rgba(226, 232, 240, 0.95)",
    background: "#ffffff",
    color: "#0f172a",
  },
  chatAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    background: "linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)",
    color: "#0284c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
  },
  chatName: {
    fontWeight: 800,
    color: "#0f172a",
  },
  chatRole: {
    color: "#64748b",
    fontSize: 12,
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  messageList: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    background:
      "radial-gradient(circle at top, rgba(224,242,254,0.6) 0%, rgba(248,250,252,0.92) 32%, rgba(241,245,249,0.98) 100%)",
    padding: "16px 18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    position: "relative",
    scrollBehavior: "smooth",
  },
  chatBackdrop: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 0,
  },
  bubble: {
    position: "absolute",
    bottom: -40,
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.72), rgba(186,230,253,0.16))",
    animationName: "chat-bubble-float",
    animationIterationCount: "infinite",
    animationTimingFunction: "ease-in-out",
  },
  whaleSilhouette: {
    position: "absolute",
    bottom: "16%",
    left: "-4%",
    fontSize: 132,
    opacity: 0.06,
    filter: "blur(0.5px)",
    animation: "whale-drift 24s ease-in-out infinite alternate",
  },
  sharkSilhouette: {
    position: "absolute",
    top: "22%",
    right: "-4%",
    fontSize: 112,
    opacity: 0.045,
    filter: "blur(0.8px)",
    animation: "shark-pass 22s linear infinite",
  },
  dayDivider: {
    display: "flex",
    justifyContent: "center",
    margin: "14px 0 8px",
    position: "relative",
    zIndex: 1,
  },
  dayDividerLabel: {
    borderRadius: 999,
    background: "rgba(255,255,255,0.75)",
    border: "1px solid rgba(191,219,254,0.8)",
    color: "#475569",
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
    backdropFilter: "blur(6px)",
  },
  messageRow: {
    display: "flex",
    position: "relative",
    zIndex: 1,
  },
  messageBubble: {
    maxWidth: "min(82%, 760px)",
    padding: "12px 14px",
    borderRadius: 22,
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    lineHeight: 1.6,
    wordBreak: "break-word",
    transition: "transform 160ms ease, box-shadow 160ms ease",
  },
  ownBubble: {
    background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
    color: "#ffffff",
    borderBottomRightRadius: 8,
  },
  ownBubbleCompact: {
    borderTopRightRadius: 10,
  },
  otherBubble: {
    background: "rgba(255,255,255,0.92)",
    color: "#0f172a",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    borderBottomLeftRadius: 8,
    backdropFilter: "blur(8px)",
  },
  otherBubbleCompact: {
    borderTopLeftRadius: 10,
  },
  messageFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.82,
  },
  messageStatus: {
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
  },
  audioPlayer: {
    width: "100%",
    minWidth: 220,
  },
  audioLoading: {
    fontSize: 12,
    opacity: 0.75,
  },
  composer: {
    position: "sticky",
    bottom: 0,
    zIndex: 3,
    padding: "12px 16px 16px",
    borderTop: "1px solid rgba(226, 232, 240, 0.95)",
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(10px)",
  },
  composerShell: {
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
    borderRadius: 20,
    border: "1px solid rgba(191,219,254,0.8)",
    background: "rgba(255,255,255,0.92)",
    padding: 10,
    boxShadow: "0 14px 28px rgba(14, 116, 144, 0.08)",
  },
  textarea: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    resize: "none",
    borderRadius: 16,
    border: "none",
    padding: "12px 14px",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 14,
    lineHeight: 1.5,
    background: "transparent",
  },
  composerActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  iconAction: {
    width: 48,
    height: 48,
    borderRadius: 16,
    border: "1px solid rgba(226, 232, 240, 0.95)",
    background: "#ffffff",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  iconActionRecording: {
    background: "#fee2e2",
    color: "#b91c1c",
    borderColor: "rgba(248, 113, 113, 0.5)",
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    border: "none",
    background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 16px 28px rgba(14, 165, 233, 0.24)",
  },
  emptyState: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
    lineHeight: 1.6,
    position: "relative",
    zIndex: 1,
  },
  blankState: {
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    gap: 12,
    padding: 24,
    color: "#64748b",
  },
  blankTitle: {
    margin: 0,
    color: "#0f172a",
  },
  blankText: {
    margin: 0,
    maxWidth: 360,
    lineHeight: 1.7,
  },
}

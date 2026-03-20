import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  FaArrowLeft,
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
import {
  getAudioPlaybackUrl,
  mergeMessage,
  sendAudioMessage,
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

export default function Chat({ adminMode = false }) {
  const { showToast } = useToast()
  const isMobile = useMediaQuery("(max-width: 900px)")
  const scrollRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const selectedContactRef = useRef(null)

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

  const supportsAudioRecording =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"

  const filteredContacts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return contacts
    return contacts.filter((contact) => {
      const haystack = `${getContactName(contact)} ${contact?.email || ""} ${contact?.role || ""}`.toLowerCase()
      return haystack.includes(normalizedSearch)
    })
  }, [contacts, search])

  const selectedConversationId = selectedContact?.id || null

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
      } catch {
        if (!cancelled) {
          setCurrentUser(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const loadConversations = useCallback(async () => {
    if (!currentUser) return

    setContactsLoading(true)

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)

      if (error) {
        return
      }

      const userIds = new Set()

      ;(data || []).forEach((msg) => {
        if (msg.sender_id !== currentUser.id) userIds.add(msg.sender_id)
        if (msg.receiver_id !== currentUser.id) userIds.add(msg.receiver_id)
      })

      const ids = Array.from(userIds)

      if (ids.length === 0) {
        setContacts([])
        setSelectedContact(null)
        return
      }

      const { data: users, error: usersError } = await supabase
        .from("utilisateurs")
        .select("*")
        .in("id", ids)

      if (usersError) {
        return
      }

      const nextUsers = users || []
      setContacts(nextUsers)
      setSelectedContact(nextUsers.length > 0 ? nextUsers[0] : null)
    } catch {
      showToast("Impossible de charger les conversations.", "error")
    } finally {
      setContactsLoading(false)
    }
  }, [currentUser, showToast])

  const loadMessages = useCallback(async () => {
    if (!currentUser || !selectedContact) {
      setMessages([])
      return
    }

    setMessagesLoading(true)
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUser.id})`,
        )
        .order("created_at", { ascending: true })

      if (error) throw error

      setMessages(data || [])
    } catch {
      showToast("Impossible de charger les messages.", "error")
    } finally {
      setMessagesLoading(false)
    }
  }, [currentUser, selectedContact, showToast])

  useEffect(() => {
    selectedContactRef.current = selectedContact
  }, [selectedContact])

  useEffect(() => {
    if (!currentUser) return
    loadConversations()
  }, [currentUser, loadConversations])

  useEffect(() => {
    loadMessages()
  }, [selectedContact, loadMessages])

  useEffect(() => {
    if (!currentUser?.id) return undefined

    return subscribeToUserMessages(currentUser.id, (nextMessage) => {
      const currentContactId = selectedContactRef.current?.id
      const belongsToCurrentConversation =
        currentContactId &&
        ((nextMessage.sender_id === currentUser.id && nextMessage.receiver_id === currentContactId) ||
          (nextMessage.receiver_id === currentUser.id && nextMessage.sender_id === currentContactId))

      if (belongsToCurrentConversation) {
        setMessages((current) => mergeMessage(current, nextMessage))
      }

      setContacts((current) => {
        const contactId = nextMessage.sender_id === currentUser.id ? nextMessage.receiver_id : nextMessage.sender_id
        const index = current.findIndex((item) => item.id === contactId)
        if (index <= 0) return current
        const nextContacts = [...current]
        const [contact] = nextContacts.splice(index, 1)
        nextContacts.unshift(contact)
        return nextContacts
      })
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
      } catch {
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
  }, [messages, messagesLoading])

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
      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: currentUser.id,
            receiver_id: selectedContact.id,
            message: trimmedDraft,
          },
        ])
        .select("*")
        .single()

      if (error) throw error

      setDraft("")
      await loadMessages()
    } catch {
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
          await sendAudioMessage({
            senderId: currentUser.id,
            receiverId: selectedConversationId,
            audioBlob,
          })

          await loadMessages()
        } catch {
          showToast("Envoi du message audio impossible.", "error")
        } finally {
          setSending(false)
        }
      }

      mediaRecorderRef.current = { recorder, stream }
      recorder.start()
      setRecording(true)
    } catch {
      showToast("Accès au micro refusé.", "error")
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.recorder?.stop()
  }

  function handleSelectContact(contact) {
    setSelectedContact(contact)
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerCard}>
        <div>
          <div style={styles.eyebrow}>{adminMode ? "Admin chat" : "Messagerie"}</div>
          <h1 style={styles.title}>Chat temps réel</h1>
          <p style={styles.subtitle}>
            Conversations instantanées, messages audio et synchronisation Supabase en direct.
          </p>
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
                <FaComments style={{ color: "#dc2626" }} />
                <strong>Conversations</strong>
              </div>
              <span style={styles.sidebarBadge}>{contacts.length}</span>
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
                      <div style={styles.contactAvatar}>
                        <FaUserCircle />
                      </div>
                      <div style={styles.contactMeta}>
                        <div style={styles.contactName}>{getContactName(contact)}</div>
                        <div style={styles.contactSubtitle}>{getContactSubtitle(contact)}</div>
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
                    {isMobile && (
                      <button type="button" style={styles.backButton} onClick={() => setSelectedContact(null)}>
                        <FaArrowLeft />
                      </button>
                    )}
                    <div style={styles.chatAvatar}>
                      <FaUserCircle />
                    </div>
                    <div>
                      <div style={styles.chatName}>{getContactName(selectedContact)}</div>
                      <div style={styles.chatRole}>{getContactSubtitle(selectedContact)}</div>
                    </div>
                  </div>
                </div>

                <div ref={scrollRef} style={styles.messageList}>
                  {messagesLoading ? (
                    <div style={styles.emptyState}>Chargement des messages...</div>
                  ) : messages.length ? (
                    messages.map((messageItem) => {
                      const isOwnMessage = messageItem.sender_id === currentUser?.id
                      const audioSrc = messageItem.audio_url ? audioUrls[messageItem.audio_url] : ""

                      return (
                        <div
                          key={messageItem.id}
                          style={{
                            ...styles.messageRow,
                            justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                          }}
                        >
                          <div
                            style={{
                              ...styles.messageBubble,
                              ...(isOwnMessage ? styles.ownBubble : styles.otherBubble),
                            }}
                          >
                            <div>{messageItem.message || ""}</div>
                            {messageItem.audio_url ? (
                              audioSrc ? (
                                <audio controls preload="none" src={audioSrc} style={styles.audioPlayer} />
                              ) : (
                                <div style={styles.audioLoading}>Audio...</div>
                              )
                            ) : null}
                            <div style={styles.messageTime}>{formatTimestamp(messageItem.created_at)}</div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div style={styles.emptyState}>Commencez cette conversation avec votre premier message.</div>
                  )}
                </div>

                <div style={styles.composer}>
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
                    <button type="button" onClick={handleSendMessage} disabled={sending || !draft.trim()} style={styles.sendButton}>
                      <FaPaperPlane />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={styles.blankState}>
                <FaComments size={40} style={{ color: "#dc2626" }} />
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
    display: "flex",
    flexDirection: "column",
    gap: 20,
    minHeight: "calc(100vh - 140px)",
  },
  headerCard: {
    borderRadius: 24,
    background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(255,255,255,0.96) 100%)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    padding: "24px 28px",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#dc2626",
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: "clamp(24px, 4vw, 34px)",
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#475569",
    lineHeight: 1.6,
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",
    gap: 20,
    minHeight: "calc(100vh - 280px)",
  },
  layoutMobile: {
    gridTemplateColumns: "1fr",
    minHeight: "calc(100vh - 240px)",
  },
  sidebar: {
    background: "#ffffff",
    borderRadius: 24,
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
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
    background: "#fee2e2",
    color: "#b91c1c",
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
    flex: 1,
    overflowY: "auto",
    padding: "0 12px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  contactItem: {
    border: "1px solid rgba(226, 232, 240, 0.9)",
    background: "#ffffff",
    borderRadius: 18,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    cursor: "pointer",
    textAlign: "left",
  },
  contactItemActive: {
    background: "#fff5f5",
    borderColor: "rgba(248, 113, 113, 0.45)",
    boxShadow: "0 10px 24px rgba(220, 38, 38, 0.08)",
  },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: "#fee2e2",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    flexShrink: 0,
  },
  contactMeta: {
    minWidth: 0,
  },
  contactName: {
    color: "#0f172a",
    fontWeight: 700,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  contactSubtitle: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chatPanel: {
    background: "#ffffff",
    borderRadius: 24,
    border: "1px solid rgba(226, 232, 240, 0.9)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.05)",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  },
  chatHeader: {
    padding: "18px 20px",
    borderBottom: "1px solid rgba(226, 232, 240, 0.9)",
    background: "#fcfcfd",
  },
  chatHeaderInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
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
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "#fee2e2",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  chatName: {
    fontWeight: 800,
    color: "#0f172a",
  },
  chatRole: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    background: "#f8fafc",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  messageRow: {
    display: "flex",
  },
  messageBubble: {
    maxWidth: "min(78%, 560px)",
    padding: "12px 14px",
    borderRadius: 18,
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    lineHeight: 1.6,
    wordBreak: "break-word",
  },
  ownBubble: {
    background: "#dc2626",
    color: "#ffffff",
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    borderBottomLeftRadius: 6,
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.74,
    alignSelf: "flex-end",
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
    padding: 16,
    borderTop: "1px solid rgba(226, 232, 240, 0.95)",
    background: "#ffffff",
    display: "flex",
    gap: 12,
    alignItems: "flex-end",
  },
  textarea: {
    flex: 1,
    minHeight: 52,
    maxHeight: 120,
    resize: "vertical",
    borderRadius: 16,
    border: "1px solid rgba(203, 213, 225, 0.95)",
    padding: "14px 16px",
    outline: "none",
    fontFamily: "inherit",
    fontSize: 14,
    lineHeight: 1.5,
  },
  composerActions: {
    display: "flex",
    gap: 10,
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
    background: "linear-gradient(135deg, #991b1b 0%, #dc2626 100%)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 16px 28px rgba(220, 38, 38, 0.24)",
  },
  emptyState: {
    padding: 24,
    textAlign: "center",
    color: "#64748b",
    lineHeight: 1.6,
  },
  blankState: {
    flex: 1,
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

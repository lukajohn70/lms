import { useState, useEffect } from "react";
import { Send, MessageSquare, Plus, Search, Check, X, ShieldAlert } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { useNavigate } from "react-router";

const Glass = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)", borderRadius: 14, boxShadow: "var(--glass-shadow)", ...style }}>{children}</div>
);

export default function ParentCommunication() {
  const navigate = useNavigate();
  const [enrolledChildren, setEnrolledChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Messaging States
  const [threads, setThreads] = useState<any[]>([]);
  const [messages, setMessages] = useState<Record<number, any[]>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  // New Chat Modal States
  const [showNewMsgModal, setShowNewMsgModal] = useState(false);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [newMsgBody, setNewMsgBody] = useState("");
  const [sendingNew, setSendingNew] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      const data = await apiClient.get("/parent/children");
      const active = data.active_children || [];
      setEnrolledChildren(active);
      if (active.length > 0) {
        // Load parent inbox if they have children
        fetchInbox();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChildren(false);
    }
  };

  const fetchInbox = async (selectId?: number) => {
    try {
      const data = await apiClient.get("/student/messages");
      setThreads(data.threads || []);
      setMessages(data.messages || {});
      
      if (data.threads && data.threads.length > 0) {
        if (selectId) {
          setSelected(selectId);
        } else if (!selected) {
          setSelected(data.threads[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load parent inbox", e);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !input.trim()) return;

    const bodyText = input;
    setInput("");

    // Optimistic UI update
    const currentMsgs = messages[selected] || [];
    setMessages({
      ...messages,
      [selected]: [...currentMsgs, { from: "Me", text: bodyText, time: "Just now", self: true }]
    });

    try {
      await apiClient.post("/student/messages/send", {
        receiver_id: selected,
        body: bodyText
      });
      fetchInbox(selected);
    } catch (e) {
      alert("Failed to send message.");
    }
  };

  const handleOpenNewMsg = async () => {
    try {
      const data = await apiClient.get("/student/teachers");
      setTeachers(data.teachers || []);
      if (data.teachers && data.teachers.length > 0) {
        setSelectedTeacherId(data.teachers[0].id);
      }
      setShowNewMsgModal(true);
    } catch (e) {
      alert("Could not load teacher directory.");
    }
  };

  const handleSendNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !newMsgBody.trim()) return;

    setSendingNew(true);
    try {
      const tId = parseInt(selectedTeacherId);
      await apiClient.post("/student/messages/send", {
        receiver_id: tId,
        body: newMsgBody
      });
      setNewMsgBody("");
      setShowNewMsgModal(false);
      await fetchInbox(tId);
    } catch (e) {
      alert("Failed to start conversation.");
    } finally {
      setSendingNew(false);
    }
  };

  if (loadingChildren) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, color: "var(--subtext)", fontSize: 14 }}>
        Loading communication portal...
      </div>
    );
  }

  // Empty state: no enrolled children
  if (enrolledChildren.length === 0) {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Communication Portal</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Direct messaging with your child's teachers</p>
        </div>
        <Glass style={{ padding: "56px 32px", textAlign: "center" }}>
          <MessageSquare size={52} style={{ color: "#FFB703", marginBottom: 18, opacity: 0.7 }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px", color: "var(--heading)" }}>No Enrolled Children Found</h3>
          <p style={{ fontSize: 13.5, color: "var(--subtext)", maxWidth: 420, margin: "0 auto 24px", lineHeight: 1.65 }}>
            Once your child is enrolled and assigned to a class, you'll be able to message their teachers directly from here. Please apply for admission or accept an admission offer to get started.
          </p>
          <button
            onClick={() => navigate("/parent/admissions")}
            style={{
              padding: "11px 24px", borderRadius: 10,
              background: "linear-gradient(135deg, #FFB703, #FB8500)",
              color: "white", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 13, boxShadow: "0 6px 20px rgba(251,133,0,0.22)"
            }}
          >
            Go to Admissions
          </button>
        </Glass>
      </div>
    );
  }

  const child = enrolledChildren[0];
  const childName = `${child.first_name || ""} ${child.last_name || ""}`.trim() || "your child";

  const filteredThreads = threads.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.last.toLowerCase().includes(search.toLowerCase())
  );

  const activeThread = threads.find(t => t.id === selected);
  const activeMsgs = selected !== null ? (messages[selected] || []) : [];

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--heading)", margin: "0 0 4px" }}>Communication Portal</h1>
          <p style={{ fontSize: 12.5, color: "var(--subtext)", margin: 0 }}>Direct messaging with {childName}'s teachers</p>
        </div>
        <button
          onClick={handleOpenNewMsg}
          style={{ padding: "8px 16px", borderRadius: 8, background: "linear-gradient(135deg, #FFB703, #FB8500)", border: "none", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 12px rgba(251,133,0,0.25)" }}
        >
          <Plus size={14} /> New Chat
        </button>
      </div>

      {threads.length === 0 ? (
        <Glass style={{ padding: "60px 40px", textAlign: "center" }}>
          <MessageSquare size={44} style={{ color: "var(--subtext)", opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--heading)", margin: "0 0 8px" }}>No Chats Started</h3>
          <p style={{ fontSize: 13, color: "var(--subtext)", maxWidth: 360, margin: "0 auto 20px", lineHeight: 1.55 }}>
            You haven't message any of {childName}'s teachers yet. Click below to start a conversation.
          </p>
          <button
            onClick={handleOpenNewMsg}
            style={{ padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg, #FFB703, #FB8500)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(251,133,0,0.25)" }}
          >
            Start Chat with Teacher
          </button>
        </Glass>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, height: "calc(100vh - 200px)" }}>
          {/* Threads list */}
          <Glass style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--glass-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 9, background: "var(--muted)", border: "1px solid var(--glass-border)" }}>
                <Search size={14} style={{ color: "var(--subtext)", flexShrink: 0 }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search messages…"
                  style={{ width: "100%", border: "none", background: "transparent", fontSize: 12.5, color: "var(--heading)", outline: "none" }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredThreads.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelected(t.id)}
                  style={{
                    padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid var(--glass-border)",
                    background: selected === t.id ? "rgba(255,183,3,0.08)" : "transparent",
                    borderLeft: selected === t.id ? "3px solid #FFB703" : "3px solid transparent",
                    transition: "all 0.15s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${t.color}20`, border: `1px solid ${t.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: t.color, flexShrink: 0 }}>
                      {t.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                        <span style={{ fontSize: 9.5, color: "var(--subtext)" }}>{t.time}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--subtext)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.last}</div>
                    </div>
                    {t.unread > 0 && (
                      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#FFB703", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{t.unread}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Glass>

          {/* Chat panel */}
          <Glass style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {activeThread ? (
              <>
                {/* Header */}
                <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${activeThread.color}20`, border: `1px solid ${activeThread.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: activeThread.color }}>
                    {activeThread.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--heading)" }}>{activeThread.name}</div>
                    <div style={{ fontSize: 11, color: "var(--subtext)" }}>{activeThread.subject}</div>
                  </div>
                </div>

                {/* Messages list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
                  {activeMsgs.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.self ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "70%", padding: "10px 14px", borderRadius: m.self ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: m.self ? "linear-gradient(135deg, #FFB703, #FB8500)" : "var(--muted)",
                        border: m.self ? "none" : "1px solid var(--glass-border)",
                        color: m.self ? "#fff" : "var(--heading)", fontSize: 13, lineHeight: 1.5
                      }}>
                        {m.text}
                        <div style={{ fontSize: 9.5, opacity: 0.6, marginTop: 4, textAlign: "right" }}>{m.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Input Form */}
                <form onSubmit={handleSend} style={{ padding: "14px 20px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: 10 }}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Type a message…"
                    style={{ flex: 1, padding: "11px 16px", borderRadius: 10, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", fontSize: 13, outline: "none" }}
                  />
                  <button type="submit" style={{ padding: "10px 18px", borderRadius: 10, background: "linear-gradient(135deg, #FFB703, #FB8500)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(251,133,0,0.25)" }}>
                    <Send size={14} /> Send
                  </button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--subtext)", fontSize: 13.5 }}>
                Select a thread to view messages.
              </div>
            )}
          </Glass>
        </div>
      )}

      {/* New Message / Chat Modal */}
      {showNewMsgModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(5px)" }}>
          <Glass style={{ width: 420, padding: 24 }}>
            <h3 style={{ fontSize: 18, margin: "0 0 16px", color: "var(--heading)" }}>Start New Conversation</h3>
            <form onSubmit={handleSendNew} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Select Teacher</label>
                {teachers.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--subtext)" }}>No teachers available in directory.</div>
                ) : (
                  <select
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", fontSize: 13 }}
                  >
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--subtext)", marginBottom: 4, display: "block" }}>Message</label>
                <textarea
                  required
                  rows={4}
                  value={newMsgBody}
                  onChange={e => setNewMsgBody(e.target.value)}
                  placeholder="Type your message here..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", outline: "none", resize: "none", boxSizing: "border-box", fontSize: 13, fontFamily: "inherit" }}
                />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowNewMsgModal(false)} style={{ flex: 1, padding: 10, borderRadius: 8, background: "var(--muted)", border: "1px solid var(--glass-border)", color: "var(--heading)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
                <button type="submit" disabled={sendingNew || !selectedTeacherId} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#FFB703", border: "none", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                  {sendingNew ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </Glass>
        </div>
      )}
    </div>
  );
}

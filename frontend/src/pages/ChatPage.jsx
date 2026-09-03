import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { fmtChatTs, fmtTime, initials, otherParticipant } from "@/lib/format";
import {
  Search, Plus, Star, Archive, Users, Inbox, MessageCircle,
  Send, Paperclip, Smile, Check, CheckCheck, MoreVertical, X, Store, Loader2, ArrowLeft
} from "lucide-react";

const FOLDERS = [
  { key: "all", label: "All", icon: Inbox },
  { key: "unread", label: "Unread", icon: MessageCircle },
  { key: "groups", label: "Groups", icon: Users },
  { key: "favorites", label: "Favorites", icon: Star },
  { key: "marketplace", label: "Marketplace", icon: Store },
  { key: "archived", label: "Archived", icon: Archive },
];

export default function ChatPage() {
  const { user } = useAuth();
  const { socket, presence } = useSocket();
  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null); // conversation object
  const [messages, setMessages] = useState([]);
  const [folder, setFolder] = useState("all");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [typingBy, setTypingBy] = useState(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const loadConvos = async () => {
    const { data } = await api.get("/chats");
    setConvos(data.conversations);
  };

  useEffect(() => { loadConvos(); }, []);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const onNew = ({ message }) => {
      setMessages((prev) => {
        if (active && (active._id === message.conversation || active.id === message.conversation)) {
          return [...prev, message];
        }
        return prev;
      });
      loadConvos();
    };
    const onBump = () => loadConvos();
    const onTyping = ({ conversationId, userId, username, isTyping }) => {
      if (!active) return;
      const activeId = active._id || active.id;
      if (activeId !== conversationId) return;
      if (userId === user.id) return;
      setTypingBy(isTyping ? username : null);
      if (isTyping) {
        clearTimeout(window.__typingT);
        window.__typingT = setTimeout(() => setTypingBy(null), 3000);
      }
    };
    const onRead = ({ conversationId, userId }) => {
      if (!active) return;
      const activeId = active._id || active.id;
      if (activeId !== conversationId) return;
      setMessages((prev) => prev.map((m) => (
        m.readBy?.includes(userId) ? m : { ...m, readBy: [...(m.readBy || []), userId] }
      )));
    };
    socket.on("message:new", onNew);
    socket.on("conversation:bump", onBump);
    socket.on("typing", onTyping);
    socket.on("message:read", onRead);
    return () => {
      socket.off("message:new", onNew);
      socket.off("conversation:bump", onBump);
      socket.off("typing", onTyping);
      socket.off("message:read", onRead);
    };
  }, [socket, active, user.id]);

  const openConvo = async (c) => {
    setActive(c);
    setLoadingMsgs(true);
    const id = c._id || c.id;
    const { data } = await api.get(`/chats/${id}/messages`);
    setMessages(data.messages);
    setLoadingMsgs(false);
    if (socket) socket.emit("conversation:join", { conversationId: id });
    api.post(`/chats/${id}/read`).catch(() => {});
  };

  const filtered = useMemo(() => {
    let list = convos;
    if (folder === "unread") list = list.filter((c) => c.unread > 0);
    else if (folder === "groups") list = list.filter((c) => c.isGroup);
    else if (folder === "favorites") list = list.filter((c) => c.isFavorite);
    else if (folder === "archived") list = list.filter((c) => c.isArchived);
    else if (folder === "marketplace") list = list.filter((c) => c.listing);
    else list = list.filter((c) => !c.isArchived);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) => {
        const other = otherParticipant(c, user.id);
        return (
          (c.name || "").toLowerCase().includes(q) ||
          (other?.username || "").toLowerCase().includes(q) ||
          (c.lastMessage?.text || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [convos, folder, query, user.id]);

  return (
    <div className="flex-1 flex min-w-0 wispr-doodle-bg">
      {/* Chats sidebar */}
      <div className={`${active ? "hidden md:flex" : "flex"} w-full md:w-[360px] bg-[#111B21] border-r border-[#222D34] flex-col shrink-0`}>
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-[#222D34]">
          <h2 className="text-xl font-bold" style={{ fontFamily: "Outfit" }}>Chats</h2>
          <button
            onClick={() => setShowNew(true)}
            data-testid="new-chat-button"
            className="w-9 h-9 rounded-full bg-[#2A3942] hover:bg-[#374045] grid place-items-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-2 bg-[#202C33] rounded-xl px-3 h-10">
            <Search className="w-4 h-4 text-[#8696A0]" />
            <input
              data-testid="chat-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search or start a new chat"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
        </div>

        {/* Folder tabs */}
        <div className="px-3 pb-2 flex gap-1 overflow-x-auto">
          {FOLDERS.map((f) => {
            const Icon = f.icon;
            const active = folder === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFolder(f.key)}
                data-testid={`folder-tab-${f.key}`}
                className={`px-3 h-8 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-all ${
                  active
                    ? "bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/40"
                    : "bg-[#202C33] text-[#8696A0] hover:text-white border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Convos list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-[#8696A0]">
              No chats in this folder yet.
            </div>
          )}
          {filtered.map((c) => {
            const other = otherParticipant(c, user.id);
            const otherId = other?._id || other?.id;
            const online = presence[otherId]?.online ?? other?.online;
            const isActive = active && ((active._id || active.id) === (c._id || c.id));
            const preview = c.lastMessage
              ? (c.lastMessage.text || (c.lastMessage.attachmentUrl ? "📎 Attachment" : ""))
              : "Say hello 👋";
            const title = c.isGroup ? c.name : other?.username || "Unknown";
            return (
              <button
                key={c._id || c.id}
                onClick={() => openConvo(c)}
                data-testid="chat-list-item"
                className={`w-full text-left px-3 py-3 flex items-center gap-3 border-b border-[#222D34]/60 transition-colors ${
                  isActive ? "bg-[#2A3942]" : "hover:bg-[#202C33]"
                }`}
              >
                <div className="relative shrink-0">
                  {other?.avatar ? (
                    <img src={other.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00A884] to-[#005C4B] grid place-items-center text-[#0B141A] font-bold">
                      {initials(title)}
                    </div>
                  )}
                  {!c.isGroup && online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25D366] border-2 border-[#111B21]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold truncate">{title}</div>
                    <div className="text-[10px] text-[#8696A0]">{fmtChatTs(c.updatedAt)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <div className="text-xs text-[#8696A0] truncate max-w-[220px]">
                      {c.listing && <span className="mr-1 text-[#00A884]">🏠</span>}
                      {preview}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {c.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                      {c.unread > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#00A884] text-[#0B141A] text-[10px] font-bold grid place-items-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat window */}
      <div className={`${active ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
        {active ? (
          <ChatWindow
            key={active._id || active.id}
            conversation={active}
            messages={messages}
            loading={loadingMsgs}
            me={user}
            typingBy={typingBy}
            socket={socket}
            onSent={(m) => setMessages((prev) => [...prev, m])}
            onFolderToggle={loadConvos}
            onBack={() => setActive(null)}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {showNew && <NewChatModal onClose={() => setShowNew(false)} onCreated={(c) => { loadConvos(); openConvo(c); setShowNew(false); }} />}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 wispr-doodle-bg grid place-items-center">
      <div className="text-center max-w-md p-8">
        <div className="w-24 h-24 mx-auto rounded-full bg-[#202C33] grid place-items-center mb-6">
          <MessageCircle className="w-12 h-12 text-[#00A884]" />
        </div>
        <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: "Outfit" }}>Wispr Web</h3>
        <p className="text-[#8696A0] leading-relaxed">
          Pick a chat from the sidebar to start messaging. Your conversations are secured end-to-end with sessions.
        </p>
      </div>
    </div>
  );
}

function ChatWindow({ conversation, messages, loading, me, typingBy, socket, onSent, onFolderToggle, onBack }) {
  const other = otherParticipant(conversation, me.id);
  const [text, setText] = useState("");
  const scrollRef = useRef(null);
  const typingT = useRef(null);
  const convoId = conversation._id || conversation.id;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleType = (v) => {
    setText(v);
    if (!socket) return;
    socket.emit("typing", { conversationId: convoId, isTyping: true });
    clearTimeout(typingT.current);
    typingT.current = setTimeout(() => {
      socket.emit("typing", { conversationId: convoId, isTyping: false });
    }, 900);
  };

  const send = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    if (socket) {
      socket.emit("message:send", { conversationId: convoId, text }, (resp) => {
        if (resp?.message) onSent(resp.message);
      });
    } else {
      api.post("/chats/messages", { conversationId: convoId, text }).then(({ data }) => onSent(data.message));
    }
    setText("");
  };

  const toggleFav = async () => {
    await api.post(`/chats/${convoId}/folder/favorites`);
    onFolderToggle();
  };
  const toggleArc = async () => {
    await api.post(`/chats/${convoId}/folder/archived`);
    onFolderToggle();
  };

  const title = conversation.isGroup ? conversation.name : other?.username || "Chat";

  return (
    <>
      {/* Chat header */}
      <div className="h-16 px-3 sm:px-4 flex items-center justify-between bg-[#202C33] border-b border-[#222D34]" data-testid="chat-header">
        <div className="flex items-center gap-3">
          <button onClick={onBack} data-testid="back-to-chat-list-button" className="md:hidden w-9 h-9 rounded-full hover:bg-[#2A3942] grid place-items-center text-[#8696A0]" title="Back to chats">
            <ArrowLeft className="w-4 h-4" />
          </button>
          {other?.avatar ? (
            <img src={other.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A884] to-[#005C4B] grid place-items-center text-[#0B141A] font-bold">
              {initials(title)}
            </div>
          )}
          <div>
            <div className="font-semibold">{title}</div>
            <div className="text-xs text-[#8696A0]">
              {typingBy ? <span className="text-[#00A884]">{typingBy} is typing…</span> :
                other?.online ? "online" : "offline"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFav}
            data-testid="favorite-toggle-button"
            className={`w-9 h-9 rounded-full grid place-items-center hover:bg-[#2A3942] transition-colors ${conversation.isFavorite ? "text-yellow-400" : "text-[#8696A0]"}`}
          >
            <Star className={`w-4 h-4 ${conversation.isFavorite ? "fill-yellow-400" : ""}`} />
          </button>
          <button
            onClick={toggleArc}
            data-testid="archive-toggle-button"
            className="w-9 h-9 rounded-full grid place-items-center hover:bg-[#2A3942] text-[#8696A0]"
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Listing banner */}
      {conversation.listing && (
        <div className="bg-[#00A884]/10 border-b border-[#00A884]/30 px-4 py-2 text-sm flex items-center gap-3">
          {conversation.listing.images?.[0]?.url && (
            <img src={conversation.listing.images[0].url} alt="" className="w-10 h-10 rounded-lg object-cover" />
          )}
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-[#00A884]">Marketplace chat</div>
            <div className="font-medium">{conversation.listing.title}</div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 wispr-doodle-bg" data-testid="messages-scroll-area">
        {loading && <div className="text-center text-[#8696A0] text-sm"><Loader2 className="w-4 h-4 inline animate-spin mr-1" /> Loading…</div>}
        {!loading && messages.length === 0 && (
          <div className="text-center text-[#8696A0] text-sm mt-10">No messages yet. Say hi 👋</div>
        )}
        <div className="flex flex-col gap-1.5 max-w-4xl mx-auto">
          {messages.map((m) => {
            const senderId = m.sender?._id || m.sender?.id || m.sender;
            const mine = senderId === me.id;
            const readByOther = (m.readBy || []).some((u) => u !== me.id && u !== senderId);
            return (
              <div key={m._id || m.id} data-testid="message-item" className={`flex ${mine ? "justify-end" : "justify-start"} fade-in-up`}>
                <div className={mine ? "msg-bubble-sent" : "msg-bubble-received"}>
                  {!mine && conversation.isGroup && (
                    <div className="text-xs font-semibold text-[#00A884] mb-0.5">{m.sender?.username}</div>
                  )}
                  <div className="text-[14px] whitespace-pre-wrap">{m.text}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-[#E9EDEF]/60">
                    <span>{fmtTime(m.createdAt)}</span>
                    {mine && (readByOther ? <CheckCheck className="w-3 h-3 text-[#53BDEB]" /> : <Check className="w-3 h-3" />)}
                  </div>
                </div>
              </div>
            );
          })}
          {typingBy && (
            <div className="flex justify-start">
              <div className="msg-bubble-received flex items-center gap-1">
                <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#8696A0] inline-block" />
                <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#8696A0] inline-block" style={{ animationDelay: "0.2s" }} />
                <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#8696A0] inline-block" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <form onSubmit={send} className="p-3 bg-[#202C33] border-t border-[#222D34] flex items-center gap-2">
        <button type="button" data-testid="emoji-button" className="w-10 h-10 rounded-full hover:bg-[#2A3942] grid place-items-center text-[#8696A0]">
          <Smile className="w-5 h-5" />
        </button>
        <button type="button" data-testid="attachment-button" className="w-10 h-10 rounded-full hover:bg-[#2A3942] grid place-items-center text-[#8696A0]">
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          data-testid="message-input"
          value={text}
          onChange={(e) => handleType(e.target.value)}
          placeholder="Type a message"
          className="flex-1 bg-[#2A3942] rounded-xl px-4 h-11 outline-none text-[#E9EDEF] placeholder:text-[#8696A0]"
        />
        <button
          type="submit"
          data-testid="send-message-button"
          className="w-11 h-11 rounded-full bg-[#00A884] hover:bg-[#008F70] grid place-items-center text-[#0B141A] transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </>
  );
}

function NewChatModal({ onClose, onCreated }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await api.get("/auth/users", { params: { q } });
      setUsers(data.users);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);
  const create = async (u) => {
    const { data } = await api.post("/chats", { participantIds: [u.id], isGroup: false });
    onCreated(data.conversation);
  };
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 grid place-items-center" onClick={onClose} data-testid="new-chat-modal">
      <div className="bg-[#202C33] rounded-2xl w-[420px] max-w-[92vw] shadow-2xl border border-[#222D34]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#222D34]">
          <div className="font-semibold">Start a new chat</div>
          <button onClick={onClose} data-testid="close-new-chat-button" className="w-8 h-8 rounded-full hover:bg-[#2A3942] grid place-items-center"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 bg-[#0B141A] rounded-xl px-3 h-10">
            <Search className="w-4 h-4 text-[#8696A0]" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="flex-1 bg-transparent outline-none text-sm" data-testid="new-chat-search-input" />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {users.map((u) => (
            <button key={u.id} onClick={() => create(u)} data-testid="new-chat-user-item" className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#2A3942] text-left">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00A884] to-[#005C4B] grid place-items-center font-bold text-[#0B141A]">
                {initials(u.username)}
              </div>
              <div>
                <div className="font-semibold">{u.username}</div>
                <div className="text-xs text-[#8696A0]">{u.email}</div>
              </div>
            </button>
          ))}
          {users.length === 0 && <div className="p-6 text-center text-sm text-[#8696A0]">No users found</div>}
        </div>
      </div>
    </div>
  );
}


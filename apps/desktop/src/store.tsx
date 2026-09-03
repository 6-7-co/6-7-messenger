import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  Conversation,
  Message,
  PinnedMessage,
  PresencePayload,
  PublicUser,
  TypingPayload,
} from '@messenger/shared';
import { ClientEvents, Events } from '@messenger/shared';
import type { Socket } from 'socket.io-client';
import {
  apiJson,
  clearSession,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setSession,
} from './lib/api';
import { createSocket } from './lib/socket';
import { API_BASE } from './lib/env';

type Status = 'booting' | 'guest' | 'ready';

interface StoreValue {
  status: Status;
  user: PublicUser | null;
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  messages: Record<string, Message[]>;
  pinned: Record<string, PinnedMessage | null>;
  typing: Record<string, string[]>;
  presence: Record<string, boolean>;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createConversation: (username: string) => Promise<void>;
  sendText: (conversationId: string, content: string) => Promise<void>;
  sendImage: (conversationId: string, file: File) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  pinMessage: (conversationId: string, messageId: string) => Promise<void>;
  unpinMessage: (conversationId: string) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  loadOlder: (conversationId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used within StoreProvider');
  return value;
}

function sortConversations(list: Conversation[]): Conversation[] {
  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function sortMessages(list: Message[]): Message[] {
  return [...list].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('booting');
  const [user, setUser] = useState<PublicUser | null>(getStoredUser());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [pinned, setPinned] = useState<Record<string, PinnedMessage | null>>({});
  const [typing, setTypingState] = useState<Record<string, string[]>>({});
  const [presence, setPresence] = useState<Record<string, boolean>>({});

  const socketRef = useRef<Socket | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const userRef = useRef<PublicUser | null>(null);

  activeIdRef.current = activeId;
  userRef.current = user;

  const markRead = useCallback(async (conversationId: string) => {
    try {
      await apiJson(`/api/conversations/${conversationId}/read`, { method: 'POST' });
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
      );
    } catch {
      void 0;
    }
  }, []);

  const appendMessage = useCallback(
    (msg: Message) => {
      setMessages((prev) => {
        const list = prev[msg.conversationId] ?? [];
        if (list.some((m) => m.id === msg.id)) return prev;
        return { ...prev, [msg.conversationId]: sortMessages([...list, msg]) };
      });

      setConversations((prev) => {
        const mine = msg.senderId === userRef.current?.id;
        const isActive = activeIdRef.current === msg.conversationId;
        const next = prev.map((c) => {
          if (c.id !== msg.conversationId) return c;
          return {
            ...c,
            lastMessage: msg,
            unreadCount: mine || isActive ? 0 : c.unreadCount + 1,
            updatedAt: msg.createdAt,
          };
        });
        return sortConversations(next);
      });

      if (
        activeIdRef.current === msg.conversationId &&
        msg.senderId !== userRef.current?.id
      ) {
        void markRead(msg.conversationId);
      }
    },
    [markRead],
  );

  const replaceMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      const list = prev[msg.conversationId] ?? [];
      const next = list.map((m) => (m.id === msg.id ? msg : m));
      return { ...prev, [msg.conversationId]: next };
    });
    setConversations((prev) =>
      prev.map((c) =>
        c.id === msg.conversationId && c.lastMessage?.id === msg.id
          ? { ...c, lastMessage: msg }
          : c,
      ),
    );
  }, []);

  const loadConversations = useCallback(async () => {
    const data = await apiJson<Conversation[]>('/api/conversations');
    setConversations(sortConversations(data));
    const pinMap: Record<string, PinnedMessage | null> = {};
    const presenceMap: Record<string, boolean> = {};
    for (const c of data) {
      pinMap[c.id] = c.pinnedMessage;
      for (const m of c.members) presenceMap[m.id] = false;
    }
    setPinned(pinMap);
    setPresence(presenceMap);
    socketRef.current?.emit('conversations:subscribe', {
      conversationIds: data.map((c) => c.id),
    });
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const data = await apiJson<Message[]>(
      `/api/conversations/${conversationId}/messages?limit=50`,
    );
    setMessages((prev) => ({ ...prev, [conversationId]: sortMessages(data) }));
  }, []);

  const loadOlder = useCallback(
    async (conversationId: string) => {
      const list = messages[conversationId] ?? [];
      const oldest = list[0];
      if (!oldest) return;
      const data = await apiJson<Message[]>(
        `/api/conversations/${conversationId}/messages?limit=50&before=${encodeURIComponent(oldest.createdAt)}`,
      );
      if (data.length === 0) return;
      setMessages((prev) => {
        const existing = prev[conversationId] ?? [];
        const merged = new Map<string, Message>();
        for (const m of [...existing, ...data]) merged.set(m.id, m);
        return { ...prev, [conversationId]: sortMessages([...merged.values()]) };
      });
    },
    [messages],
  );

  useEffect(() => {
    const refresh = getRefreshToken();
    if (!refresh) {
      setStatus('guest');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
          credentials: 'include',
        });
        if (res.ok) {
          const data = (await res.json()) as {
            user: PublicUser;
            tokens: { accessToken: string; refreshToken: string };
          };
          setSession(data.tokens, data.user);
          setUser(data.user);
          setStatus('ready');
        } else {
          clearSession();
          setUser(null);
          setStatus('guest');
        }
      } catch {
        clearSession();
        setUser(null);
        setStatus('guest');
      }
    })();
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !user) return;

    void loadConversations();

    const token = getAccessToken();
    if (!token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    const onMessageNew = (msg: Message) => appendMessage(msg);
    const onMessageUpdated = (msg: Message) => replaceMessage(msg);
    const onMessageDeleted = (msg: Message) => replaceMessage(msg);
    const onMessagePinned = (payload: PinnedMessage) =>
      setPinned((prev) => ({ ...prev, [payload.conversationId]: payload }));
    const onMessageUnpinned = (payload: { conversationId: string }) =>
      setPinned((prev) => ({ ...prev, [payload.conversationId]: null }));
    const onTyping = (payload: TypingPayload) =>
      setTypingState((prev) => {
        const current = new Set(prev[payload.conversationId] ?? []);
        if (payload.isTyping) current.add(payload.userId);
        else current.delete(payload.userId);
        return { ...prev, [payload.conversationId]: [...current] };
      });
    const onPresence = (payload: PresencePayload) =>
      setPresence((prev) => ({ ...prev, [payload.userId]: payload.online }));
    const onConversationNew = (conversation: Conversation) => {
      setConversations((prev) => {
        if (prev.some((c) => c.id === conversation.id)) return prev;
        return sortConversations([conversation, ...prev]);
      });
      setPinned((prev) => ({ ...prev, [conversation.id]: conversation.pinnedMessage }));
    };

    socket.on(Events.messageNew, onMessageNew);
    socket.on(Events.messageUpdated, onMessageUpdated);
    socket.on(Events.messageDeleted, onMessageDeleted);
    socket.on(Events.messagePinned, onMessagePinned);
    socket.on(Events.messageUnpinned, onMessageUnpinned);
    socket.on(Events.typing, onTyping);
    socket.on(Events.presence, onPresence);
    socket.on(Events.conversationNew, onConversationNew);

    return () => {
      socket.off(Events.messageNew, onMessageNew);
      socket.off(Events.messageUpdated, onMessageUpdated);
      socket.off(Events.messageDeleted, onMessageDeleted);
      socket.off(Events.messagePinned, onMessagePinned);
      socket.off(Events.messageUnpinned, onMessageUnpinned);
      socket.off(Events.typing, onTyping);
      socket.off(Events.presence, onPresence);
      socket.off(Events.conversationNew, onConversationNew);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [status, user?.id, loadConversations, appendMessage, replaceMessage]);

  useEffect(() => {
    if (status !== 'ready' || !activeId) return;
    void loadMessages(activeId);
    void markRead(activeId);
  }, [activeId, status, loadMessages, markRead]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiJson<{
      user: PublicUser;
      tokens: { accessToken: string; refreshToken: string };
    }>('/api/auth/login', { method: 'POST', body: { username, password }, auth: false });
    setSession(data.tokens, data.user);
    setUser(data.user);
    setStatus('ready');
  }, []);

  const register = useCallback(
    async (username: string, displayName: string, password: string) => {
      const data = await apiJson<{
        user: PublicUser;
        tokens: { accessToken: string; refreshToken: string };
      }>('/api/auth/register', {
        method: 'POST',
        body: { username, displayName, password },
        auth: false,
      });
      setSession(data.tokens, data.user);
      setUser(data.user);
      setStatus('ready');
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiJson('/api/auth/logout', { method: 'POST' });
    } catch {
      void 0;
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
    clearSession();
    setUser(null);
    setConversations([]);
    setMessages({});
    setPinned({});
    setTypingState({});
    setActiveId(null);
    setStatus('guest');
  }, []);

  const createConversation = useCallback(async (username: string) => {
    const conversation = await apiJson<Conversation>('/api/conversations/direct', {
      method: 'POST',
      body: { username },
    });
    setConversations((prev) => {
      if (prev.some((c) => c.id === conversation.id)) return prev;
      return sortConversations([conversation, ...prev]);
    });
    setPinned((prev) => ({ ...prev, [conversation.id]: conversation.pinnedMessage }));
    setActiveId(conversation.id);
  }, []);

  const sendText = useCallback(
    async (conversationId: string, content: string) => {
      const msg = await apiJson<Message>(
        `/api/conversations/${conversationId}/messages/text`,
        { method: 'POST', body: { content } },
      );
      appendMessage(msg);
    },
    [appendMessage],
  );

  const sendImage = useCallback(
    async (conversationId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      const uploaded = await apiJson<{
        url: string;
        width?: number;
        height?: number;
        size?: number;
      }>('/api/uploads/images', { method: 'POST', body: form, isForm: true });
      const msg = await apiJson<Message>(
        `/api/conversations/${conversationId}/messages/image`,
        {
          method: 'POST',
          body: {
            imageUrl: uploaded.url,
            width: uploaded.width,
            height: uploaded.height,
            size: uploaded.size,
          },
        },
      );
      appendMessage(msg);
    },
    [appendMessage],
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const msg = await apiJson<Message>(`/api/messages/${messageId}`, {
        method: 'PATCH',
        body: { content },
      });
      replaceMessage(msg);
    },
    [replaceMessage],
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const msg = await apiJson<Message>(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });
      replaceMessage(msg);
    },
    [replaceMessage],
  );

  const pinMessage = useCallback(async (conversationId: string, messageId: string) => {
    const payload = await apiJson<PinnedMessage>(`/api/conversations/${conversationId}/pin`, {
      method: 'POST',
      body: { messageId },
    });
    setPinned((prev) => ({ ...prev, [conversationId]: payload }));
  }, []);

  const unpinMessage = useCallback(async (conversationId: string) => {
    await apiJson(`/api/conversations/${conversationId}/pin`, { method: 'DELETE' });
    setPinned((prev) => ({ ...prev, [conversationId]: null }));
  }, []);

  const setTyping = useCallback((conversationId: string, isTyping: boolean) => {
    socketRef.current?.emit(ClientEvents.typingSet, { conversationId, isTyping });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      status,
      user,
      conversations,
      activeId,
      setActiveId,
      messages,
      pinned,
      typing,
      presence,
      login,
      register,
      logout,
      createConversation,
      sendText,
      sendImage,
      editMessage,
      deleteMessage,
      pinMessage,
      unpinMessage,
      markRead,
      loadOlder,
      setTyping,
    }),
    [
      status,
      user,
      conversations,
      activeId,
      messages,
      pinned,
      typing,
      presence,
      login,
      register,
      logout,
      createConversation,
      sendText,
      sendImage,
      editMessage,
      deleteMessage,
      pinMessage,
      unpinMessage,
      markRead,
      loadOlder,
      setTyping,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

import { create } from 'zustand';
import api from '../services/api.js';

const useChatStore = create((set, get) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  typingUsers: {},
  loading: false,

  fetchRooms: async () => {
    try {
      const { data } = await api.get('/rooms');
      set({ rooms: data });
    } catch {}
  },

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  fetchMessages: async (roomId, before) => {
    try {
      const params = before ? `?before=${before}&limit=50` : '?limit=50';
      const { data } = await api.get(`/messages/${roomId}${params}`);
      set(state => ({
        messages: {
          ...state.messages,
          [roomId]: before
            ? [...data, ...(state.messages[roomId] || [])]
            : data,
        },
      }));
      return data;
    } catch {
      return [];
    }
  },

  addMessage: (message) => {
    set(state => ({
      messages: {
        ...state.messages,
        [message.roomId]: [...(state.messages[message.roomId] || []), message],
      },
      rooms: state.rooms.map(r =>
        r.id === message.roomId
          ? { ...r, messages: [message], updatedAt: message.createdAt }
          : r
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    }));
  },

  deleteMessage: ({ messageId, roomId }) => {
    set(state => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] || []).filter(m => m.id !== messageId),
      },
    }));
  },

  addRoom: (room) => {
    set(state => {
      const exists = state.rooms.find(r => r.id === room.id);
      if (exists) return state;
      return { rooms: [room, ...state.rooms] };
    });
  },

  setTyping: (roomId, userId, username, isTyping) => {
    set(state => {
      const key = `${roomId}:${userId}`;
      const typing = { ...state.typingUsers };
      if (isTyping) {
        typing[key] = { roomId, userId, username };
      } else {
        delete typing[key];
      }
      return { typingUsers: typing };
    });
  },

  updateUserStatus: (userId, status) => {
    set(state => ({
      rooms: state.rooms.map(room => ({
        ...room,
        members: room.members?.map(m =>
          m.userId === userId ? { ...m, user: { ...m.user, status } } : m
        ),
      })),
    }));
  },

  getTypingInRoom: (roomId) => {
    const { typingUsers } = get();
    return Object.values(typingUsers).filter(t => t.roomId === roomId);
  },
}));

export default useChatStore;

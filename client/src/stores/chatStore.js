import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import gun, { SEA, user } from '../lib/gun.js';

// Gun 경로: kkimyd/rooms/<roomId>/msgs/<msgId>
// Gun 경로: kkimyd/users/<pub>

function getRoomId(pub1, pub2) {
  return [pub1, pub2].sort().join('__');
}

const useChatStore = create((set, get) => ({
  rooms: [],
  messages: {},      // roomId → message[]
  typingUsers: {},   // roomId → { pub: username }
  userCache: {},     // pub → { alias, status }
  listeners: {},     // roomId → Gun listener refs

  // 유저 정보 조회 (캐시)
  fetchUser: (pub) => {
    if (!pub) return;
    if (get().userCache[pub]) return;
    gun.get('kkimyd/users').get(pub).on((data) => {
      if (data) {
        set(s => ({ userCache: { ...s.userCache, [pub]: { alias: data.alias, pub, status: data.status } } }));
      }
    });
  },

  // 내 방 목록 구독
  subscribeRooms: (myPub) => {
    gun.user().get('kkimyd/rooms').map().on((roomMeta, roomId) => {
      if (!roomMeta || !roomId || roomId === '_') return;
      gun.get('kkimyd/rooms').get(roomId).once((roomData) => {
        if (!roomData) return;
        set(s => {
          const exists = s.rooms.find(r => r.id === roomId);
          if (exists) {
            return { rooms: s.rooms.map(r => r.id === roomId ? { ...r, ...roomData } : r) };
          }
          return { rooms: [...s.rooms, { ...roomData, id: roomId }].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) };
        });
        // 방 메타 실시간 구독
        gun.get('kkimyd/rooms').get(roomId).on((data) => {
          if (!data) return;
          set(s => ({
            rooms: s.rooms.map(r => r.id === roomId ? { ...r, ...data } : r)
              .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
          }));
        });
      });
      // 멤버 유저 정보 미리 로드
      if (typeof roomMeta === 'object' && roomMeta.members) {
        Object.keys(roomMeta.members).forEach(pub => get().fetchUser(pub));
      }
    });
  },

  // 방 메시지 구독
  subscribeMessages: (roomId) => {
    if (get().listeners[roomId]) return;

    const ref = gun.get('kkimyd/rooms').get(roomId).get('msgs');
    const handler = ref.map().on((msg, key) => {
      if (!msg || !msg.id || !msg.senderId) return;
      set(s => {
        const existing = s.messages[roomId] || [];
        if (existing.find(m => m.id === msg.id)) {
          return { messages: { ...s.messages, [roomId]: existing.map(m => m.id === msg.id ? msg : m) } };
        }
        const updated = [...existing, msg].sort((a, b) => a.createdAt - b.createdAt);
        return { messages: { ...s.messages, [roomId]: updated } };
      });
      // 방 최신시간 갱신
      set(s => ({
        rooms: s.rooms.map(r => r.id === roomId ? { ...r, updatedAt: msg.createdAt, lastMsg: msg } : r)
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      }));
      get().fetchUser(msg.senderId);
    });

    set(s => ({ listeners: { ...s.listeners, [roomId]: handler } }));
  },

  // 1:1 채팅방 열기 (없으면 생성)
  openDirectRoom: async (myPub, targetPub) => {
    const roomId = getRoomId(myPub, targetPub);
    const members = { [myPub]: true, [targetPub]: true };
    const roomData = { id: roomId, type: 'direct', members, createdAt: Date.now(), updatedAt: Date.now() };

    gun.get('kkimyd/rooms').get(roomId).put(roomData);
    gun.user().get('kkimyd/rooms').get(roomId).put({ id: roomId, type: 'direct' });

    // 상대방의 유저 노드에도 이 방 등록 (온라인 시 자동 수신)
    gun.get('kkimyd/users').get(targetPub).get('rooms').get(roomId).put({ id: roomId, type: 'direct' });

    set(s => {
      if (s.rooms.find(r => r.id === roomId)) return s;
      return { rooms: [{ ...roomData }, ...s.rooms] };
    });

    return roomId;
  },

  // 그룹 채팅 생성
  createGroupRoom: async (myPub, name, memberPubs) => {
    const roomId = uuidv4();
    const allPubs = [...new Set([myPub, ...memberPubs])];
    const members = Object.fromEntries(allPubs.map(p => [p, true]));
    const roomData = { id: roomId, type: 'group', name, members, createdAt: Date.now(), updatedAt: Date.now() };

    gun.get('kkimyd/rooms').get(roomId).put(roomData);
    allPubs.forEach(pub => {
      if (pub === myPub) {
        gun.user().get('kkimyd/rooms').get(roomId).put({ id: roomId, type: 'group', name });
      } else {
        gun.get('kkimyd/users').get(pub).get('rooms').get(roomId).put({ id: roomId, type: 'group', name });
      }
    });

    set(s => ({ rooms: [{ ...roomData }, ...s.rooms] }));
    return roomId;
  },

  // 메시지 전송
  sendMessage: async (roomId, myPub, payload) => {
    const msg = {
      id: uuidv4(),
      roomId,
      senderId: myPub,
      createdAt: Date.now(),
      ...payload,
    };
    gun.get('kkimyd/rooms').get(roomId).get('msgs').get(msg.id).put(msg);
    gun.get('kkimyd/rooms').get(roomId).put({ updatedAt: msg.createdAt });
    return msg;
  },

  // 메시지 삭제 (내 것만)
  deleteMessage: (roomId, msgId, myPub) => {
    gun.get('kkimyd/rooms').get(roomId).get('msgs').get(msgId).once((msg) => {
      if (msg && msg.senderId === myPub) {
        gun.get('kkimyd/rooms').get(roomId).get('msgs').get(msgId).put({ ...msg, deleted: true, content: null });
      }
    });
  },

  // 타이핑
  setTyping: (roomId, myPub, alias, isTyping) => {
    gun.get('kkimyd/rooms').get(roomId).get('typing').get(myPub).put(
      isTyping ? { alias, ts: Date.now() } : null
    );
  },

  subscribeTyping: (roomId, myPub) => {
    gun.get('kkimyd/rooms').get(roomId).get('typing').map().on((data, pub) => {
      if (pub === myPub) return;
      const now = Date.now();
      if (data && data.ts && now - data.ts < 4000) {
        set(s => ({ typingUsers: { ...s.typingUsers, [roomId]: { ...s.typingUsers[roomId], [pub]: data.alias } } }));
      } else {
        set(s => {
          const rt = { ...(s.typingUsers[roomId] || {}) };
          delete rt[pub];
          return { typingUsers: { ...s.typingUsers, [roomId]: rt } };
        });
      }
    });
  },

  getTypingInRoom: (roomId) => {
    return Object.values(get().typingUsers[roomId] || {});
  },

  getRoomName: (room, myPub, userCache) => {
    if (room.name) return room.name;
    if (room.type === 'direct' && room.members) {
      const otherPub = Object.keys(room.members).find(p => p !== myPub);
      return userCache[otherPub]?.alias || otherPub?.slice(0, 8) || '알 수 없음';
    }
    return '채팅방';
  },

  getOtherUser: (room, myPub, userCache) => {
    if (room.type !== 'direct' || !room.members) return null;
    const otherPub = Object.keys(room.members).find(p => p !== myPub);
    return userCache[otherPub] || null;
  },
}));

export default useChatStore;

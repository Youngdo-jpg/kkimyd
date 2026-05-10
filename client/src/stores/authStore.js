import { create } from 'zustand';
import gun, { SEA, user } from '../lib/gun.js';

const useAuthStore = create((set, get) => ({
  currentUser: null,  // { alias, pub }
  loading: false,
  error: null,

  // Gun SEA 기반 로그인 - 키 쌍으로 인증, 서버 불필요
  login: async (alias, password) => {
    set({ loading: true, error: null });
    return new Promise((resolve) => {
      user.auth(alias, password, (ack) => {
        if (ack.err) {
          set({ loading: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
          return resolve({ success: false });
        }
        const pub = user.is?.pub;
        const userData = { alias, pub };
        // 온라인 상태 공개 피어 공간에 게시
        gun.get('kkimyd/users').get(pub).put({ alias, pub, status: 'online', updatedAt: Date.now() });
        set({ currentUser: userData, loading: false });
        resolve({ success: true });
      });
    });
  },

  // Gun SEA 기반 회원가입 - 공개키/비밀키 쌍 생성
  register: async (alias, password) => {
    set({ loading: true, error: null });
    return new Promise((resolve) => {
      user.create(alias, password, (ack) => {
        if (ack.err) {
          const msg = ack.err.includes('already')
            ? '이미 사용 중인 아이디입니다.'
            : ack.err;
          set({ loading: false, error: msg });
          return resolve({ success: false });
        }
        set({ loading: false });
        resolve({ success: true });
      });
    });
  },

  logout: () => {
    const pub = user.is?.pub;
    if (pub) {
      gun.get('kkimyd/users').get(pub).get('status').put('offline');
    }
    user.leave();
    set({ currentUser: null });
  },

  // 앱 시작 시 이전 세션 복원
  restoreSession: () => {
    return new Promise((resolve) => {
      // recall은 gun.js에서 자동으로 처리됨
      setTimeout(() => {
        if (user.is) {
          const pub = user.is.pub;
          gun.get('kkimyd/users').get(pub).once((data) => {
            if (data) {
              gun.get('kkimyd/users').get(pub).get('status').put('online');
              set({ currentUser: { alias: data.alias, pub } });
            }
            resolve();
          });
        } else {
          resolve();
        }
      }, 500); // Gun recall 대기
    });
  },
}));

export default useAuthStore;

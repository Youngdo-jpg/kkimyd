import { create } from 'zustand';
import api from '../services/api.js';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID();
      const deviceName = `${navigator.platform} / ${navigator.userAgent.split(' ').slice(-1)[0]}`;
      const { data } = await api.post('/auth/login', { email, password, deviceId, deviceName });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('deviceId', data.deviceId);
      set({ user: data.user, token: data.token, loading: false });
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || '로그인 실패';
      set({ loading: false, error });
      return { success: false, error };
    }
  },

  register: async (username, email, password) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/register', { username, email, password });
      set({ loading: false });
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.error || '회원가입 실패';
      set({ loading: false, error });
      return { success: false, error };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  updateUser: (userData) => {
    const updated = { ...get().user, ...userData };
    localStorage.setItem('user', JSON.stringify(updated));
    set({ user: updated });
  },
}));

export default useAuthStore;

import { create } from 'zustand';
import { savePeers } from '../lib/gun.js';

const usePeerStore = create((set, get) => ({
  peers: JSON.parse(localStorage.getItem('kkimyd_peers') || '[]'),

  addPeer: (url) => {
    const cleaned = url.trim().replace(/\/$/, '');
    if (!cleaned) return;
    const peers = [...new Set([...get().peers, cleaned])];
    savePeers(peers);
    set({ peers });
    // Gun에 런타임으로 피어 추가하려면 페이지 새로고침 필요
    return peers;
  },

  removePeer: (url) => {
    const peers = get().peers.filter(p => p !== url);
    savePeers(peers);
    set({ peers });
  },
}));

export default usePeerStore;

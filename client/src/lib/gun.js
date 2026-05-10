import Gun from 'gun';
import 'gun/sea';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';

// 릴레이 피어 목록 - 로컬 설정으로 변경 가능
function getPeers() {
  try {
    const saved = localStorage.getItem('kkimyd_peers');
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function savePeers(peers) {
  localStorage.setItem('kkimyd_peers', JSON.stringify(peers));
}

// Gun 인스턴스 - 각 기기의 로컬 DB + P2P 동기화
const gun = Gun({
  peers: getPeers(),
  localStorage: false, // IndexedDB 사용 (rindexed)
  radisk: true,
  axe: false,          // 자동 피어 확장 비활성화 (프라이버시)
});

export const SEA = Gun.SEA;
export const user = gun.user();

// 앱 시작 시 이전 세션 복원
user.recall({ sessionStorage: true });

export default gun;

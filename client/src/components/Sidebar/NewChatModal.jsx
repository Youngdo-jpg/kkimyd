import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gun from '../../lib/gun.js';
import useAuthStore from '../../stores/authStore.js';
import useChatStore from '../../stores/chatStore.js';

export default function NewChatModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const { currentUser } = useAuthStore();
  const { openDirectRoom, createGroupRoom } = useChatStore();
  const navigate = useNavigate();

  const search = (q) => {
    setQuery(q);
    if (q.length < 1) { setResults([]); return; }
    setSearching(true);
    const found = [];

    // Gun 전체 유저 목록에서 아이디 검색
    gun.get('kkimyd/users').map().once((data, pub) => {
      if (!data || pub === currentUser?.pub) return;
      if (data.alias && data.alias.toLowerCase().includes(q.toLowerCase())) {
        if (!found.find(u => u.pub === pub)) {
          found.push({ pub, alias: data.alias, status: data.status });
          setResults([...found]);
        }
      }
    });

    setTimeout(() => setSearching(false), 1500);
  };

  const toggle = (user) => {
    setSelected(prev =>
      prev.find(u => u.pub === user.pub)
        ? prev.filter(u => u.pub !== user.pub)
        : [...prev, user]
    );
  };

  const start = async () => {
    if (!selected.length) return;
    setLoading(true);
    let roomId;
    if (selected.length === 1) {
      roomId = await openDirectRoom(currentUser.pub, selected[0].pub);
    } else {
      const name = groupName || selected.map(u => u.alias).join(', ');
      roomId = await createGroupRoom(currentUser.pub, name, selected.map(u => u.pub));
    }
    navigate(`/room/${roomId}`);
    onClose();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-800">새 채팅</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            type="text"
            placeholder="아이디 검색"
            value={query}
            onChange={e => search(e.target.value)}
            className="input-field"
            autoFocus
          />

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(u => (
                <span key={u.pub} onClick={() => toggle(u)}
                  className="flex items-center gap-1 bg-kakao-yellow text-kakao-brown text-xs px-2 py-1 rounded-full cursor-pointer">
                  {u.alias} ✕
                </span>
              ))}
            </div>
          )}

          {selected.length > 1 && (
            <input
              type="text"
              placeholder="그룹 이름 (선택)"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="input-field"
            />
          )}

          <div className="max-h-52 overflow-y-auto space-y-1">
            {searching && results.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">검색 중...</p>
            )}
            {results.map(u => (
              <button key={u.pub} onClick={() => toggle(u)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  selected.find(s => s.pub === u.pub) ? 'bg-kakao-yellow/30' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-9 h-9 bg-kakao-yellow rounded-full flex items-center justify-center font-bold text-kakao-brown text-sm">
                  {u.alias[0]?.toUpperCase()}
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-gray-800">{u.alias}</p>
                  <p className="text-xs text-gray-400">{u.status === 'online' ? '🟢 온라인' : '오프라인'}</p>
                </div>
                {selected.find(s => s.pub === u.pub) && (
                  <div className="w-5 h-5 bg-kakao-yellow rounded-full flex items-center justify-center text-xs">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t">
          <button onClick={start} disabled={!selected.length || loading} className="btn-kakao disabled:opacity-50">
            {loading ? '생성 중...' : selected.length > 1 ? `그룹 채팅 시작 (${selected.length}명)` : '채팅 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}

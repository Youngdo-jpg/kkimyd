import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import useChatStore from '../../stores/chatStore.js';

export default function NewChatModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const { addRoom, setActiveRoom } = useChatStore();
  const navigate = useNavigate();

  const search = async (q) => {
    setQuery(q);
    if (q.length < 1) { setResults([]); return; }
    const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
    setResults(data);
  };

  const toggleSelect = (user) => {
    setSelected(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const startChat = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    try {
      if (selected.length === 1) {
        const { data } = await api.post('/rooms/direct', { targetUserId: selected[0].id });
        addRoom(data);
        navigate(`/room/${data.id}`);
      } else {
        const name = groupName || selected.map(u => u.username).join(', ');
        const { data } = await api.post('/rooms/group', {
          name,
          memberIds: selected.map(u => u.id),
        });
        addRoom(data);
        navigate(`/room/${data.id}`);
      }
      onClose();
    } catch (err) {
      alert('채팅방 생성 실패');
    } finally {
      setLoading(false);
    }
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
            placeholder="이름 또는 이메일 검색"
            value={query}
            onChange={e => search(e.target.value)}
            className="input-field"
            autoFocus
          />

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(u => (
                <span
                  key={u.id}
                  onClick={() => toggleSelect(u)}
                  className="flex items-center gap-1 bg-kakao-yellow text-kakao-brown text-xs px-2 py-1 rounded-full cursor-pointer"
                >
                  {u.username} ✕
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

          <div className="max-h-60 overflow-y-auto space-y-1">
            {results.map(user => (
              <button
                key={user.id}
                onClick={() => toggleSelect(user)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  selected.find(u => u.id === user.id) ? 'bg-kakao-yellow/30' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-10 h-10 bg-kakao-yellow rounded-full flex items-center justify-center font-bold text-kakao-brown">
                  {user.username[0]?.toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{user.username}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                {selected.find(u => u.id === user.id) && (
                  <div className="ml-auto w-5 h-5 bg-kakao-yellow rounded-full flex items-center justify-center text-xs">✓</div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t">
          <button
            onClick={startChat}
            disabled={selected.length === 0 || loading}
            className="btn-kakao disabled:opacity-50"
          >
            {loading ? '생성 중...' : selected.length > 1 ? `그룹 채팅 시작 (${selected.length}명)` : '채팅 시작'}
          </button>
        </div>
      </div>
    </div>
  );
}

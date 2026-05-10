import React, { useState } from 'react';
import usePeerStore from '../../stores/peerStore.js';

export default function PeerSettings({ onClose }) {
  const { peers, addPeer, removePeer } = usePeerStore();
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input.trim()) return;
    let url = input.trim();
    // ws:// 또는 http:// 정규화
    if (!url.startsWith('ws') && !url.startsWith('http')) url = `ws://${url}`;
    if (!url.endsWith('/gun')) url = `${url}/gun`;
    addPeer(url);
    setInput('');
    if (confirm('피어를 추가했습니다. 적용하려면 페이지를 새로고침하세요.\n지금 새로고침하시겠습니까?')) {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800">릴레이 피어 설정</h2>
            <p className="text-xs text-gray-400 mt-0.5">기기 간 연결을 위한 릴레이 피어 주소</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 space-y-1">
            <p className="font-semibold">릴레이 피어란?</p>
            <p>어느 PC든 <code className="bg-white px-1 rounded">cd relay && node server.js</code> 실행하면 릴레이가 됩니다.</p>
            <p>릴레이 없이도 같은 네트워크(WiFi)에서는 자동 P2P 연결됩니다.</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ws://192.168.0.10:8765/gun"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="input-field flex-1 text-xs"
            />
            <button onClick={handleAdd} className="px-3 py-2 bg-kakao-yellow text-kakao-brown rounded-xl text-sm font-semibold">
              추가
            </button>
          </div>

          {peers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-semibold">등록된 피어</p>
              {peers.map(peer => (
                <div key={peer} className="flex items-center justify-between p-2 bg-gray-50 rounded-xl">
                  <span className="text-xs text-gray-600 truncate flex-1">{peer}</span>
                  <button onClick={() => removePeer(peer)} className="text-red-400 hover:text-red-600 ml-2 text-xs">삭제</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">등록된 릴레이 피어 없음<br/>(같은 WiFi라면 자동 연결)</p>
          )}
        </div>
      </div>
    </div>
  );
}

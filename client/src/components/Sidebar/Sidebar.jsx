import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../../stores/authStore.js';
import useChatStore from '../../stores/chatStore.js';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import NewChatModal from './NewChatModal.jsx';
import PeerSettings from '../Common/PeerSettings.jsx';

export default function Sidebar() {
  const { currentUser, logout } = useAuthStore();
  const { rooms, userCache, getRoomName, getOtherUser } = useChatStore();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showPeers, setShowPeers] = useState(false);

  const handleRoomClick = (id) => navigate(`/room/${id}`);

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  const getAvatar = (room) => {
    const name = getRoomName(room, currentUser?.pub, userCache);
    return name?.[0]?.toUpperCase() || '?';
  };

  const getLastMsgPreview = (room) => {
    const msg = room.lastMsg;
    if (!msg) return '대화를 시작해보세요';
    if (msg.deleted) return '삭제된 메시지';
    if (msg.type === 'text') return msg.content || '';
    if (msg.type === 'image') return '📷 사진';
    if (msg.type === 'video') return '🎬 동영상';
    return `📎 ${msg.fileName || '파일'}`;
  };

  const isOtherOnline = (room) => {
    const other = getOtherUser(room, currentUser?.pub, userCache);
    return other?.status === 'online';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-kakao-yellow rounded-full flex items-center justify-center text-sm font-bold text-kakao-brown flex-shrink-0">
            {currentUser?.alias?.[0]?.toUpperCase()}
          </div>
          <span className="font-semibold text-sm text-gray-800 truncate">{currentUser?.alias}</span>
        </div>
        <div className="flex gap-0.5 flex-shrink-0">
          <button onClick={() => setShowPeers(true)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="릴레이 피어 설정">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
          <button onClick={() => setShowNewChat(true)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg" title="새 채팅">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg" title="로그아웃">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-white">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 p-4">
            <div className="text-4xl">💬</div>
            <p className="text-sm text-center">채팅을 시작해보세요</p>
            <button onClick={() => setShowNewChat(true)} className="px-4 py-2 bg-kakao-yellow text-kakao-brown text-sm font-semibold rounded-xl">
              새 채팅 시작
            </button>
          </div>
        ) : (
          rooms.map(room => (
            <button
              key={room.id}
              onClick={() => handleRoomClick(room.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 ${
                roomId === room.id ? 'bg-yellow-50 border-r-2 border-kakao-yellow' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 bg-kakao-yellow rounded-full flex items-center justify-center text-kakao-brown font-bold">
                  {getAvatar(room)}
                </div>
                {isOtherOnline(room) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-sm text-gray-800 truncate">
                    {getRoomName(room, currentUser?.pub, userCache)}
                    {room.type === 'group' && room.members && (
                      <span className="text-gray-400 font-normal ml-1 text-xs">
                        {Object.keys(room.members).length}
                      </span>
                    )}
                  </span>
                  {room.updatedAt && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatDistanceToNow(new Date(room.updatedAt), { locale: ko, addSuffix: true })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{getLastMsgPreview(room)}</p>
              </div>
            </button>
          ))
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showPeers && <PeerSettings onClose={() => setShowPeers(false)} />}
    </div>
  );
}

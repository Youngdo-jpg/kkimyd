import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useChatStore from '../../stores/chatStore.js';
import useAuthStore from '../../stores/authStore.js';
import api from '../../services/api.js';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import NewChatModal from './NewChatModal.jsx';
import SessionsModal from './SessionsModal.jsx';

export default function Sidebar({ onRoomSelect }) {
  const { rooms } = useChatStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [showNewChat, setShowNewChat] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [tab, setTab] = useState('chats');

  const handleRoomClick = (id) => {
    navigate(`/room/${id}`);
    onRoomSelect?.();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoomName = (room) => {
    if (room.name) return room.name;
    const other = room.members?.find(m => m.userId !== user?.id);
    return other?.user?.username || '알 수 없음';
  };

  const getRoomStatus = (room) => {
    if (room.type === 'direct') {
      const other = room.members?.find(m => m.userId !== user?.id);
      return other?.user?.status === 'online' ? '온라인' : '';
    }
    return `${room.members?.length || 0}명`;
  };

  const getLastMessage = (room) => {
    const msg = room.messages?.[0];
    if (!msg) return '대화를 시작해보세요';
    if (msg.type === 'text') return msg.content;
    if (msg.type === 'image') return '📷 사진';
    if (msg.type === 'video') return '🎬 동영상';
    return `📎 ${msg.fileName || '파일'}`;
  };

  const getAvatar = (room) => {
    if (room.type === 'direct') {
      const other = room.members?.find(m => m.userId !== user?.id);
      return other?.user?.username?.[0]?.toUpperCase() || '?';
    }
    return room.name?.[0]?.toUpperCase() || '#';
  };

  const isOnline = (room) => {
    if (room.type !== 'direct') return false;
    const other = room.members?.find(m => m.userId !== user?.id);
    return other?.user?.status === 'online';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-kakao-yellow rounded-full flex items-center justify-center text-sm font-bold text-kakao-brown">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <span className="font-semibold text-sm text-gray-800">{user?.username}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowSessions(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="연결된 기기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => setShowNewChat(true)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="새 채팅"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="로그아웃"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <div className="text-4xl">💬</div>
            <p className="text-sm">채팅을 시작해보세요</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="mt-2 px-4 py-2 bg-kakao-yellow text-kakao-brown text-sm font-semibold rounded-xl"
            >
              새 채팅 시작
            </button>
          </div>
        ) : (
          rooms.map(room => (
            <button
              key={room.id}
              onClick={() => handleRoomClick(room.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                roomId === room.id ? 'bg-yellow-50 border-r-2 border-kakao-yellow' : ''
              }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-kakao-yellow rounded-full flex items-center justify-center text-kakao-brown font-bold text-lg">
                  {getAvatar(room)}
                </div>
                {isOnline(room) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-800 truncate">{getRoomName(room)}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-1">
                    {room.updatedAt ? formatDistanceToNow(new Date(room.updatedAt), { locale: ko, addSuffix: true }) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-gray-400 truncate">{getLastMessage(room)}</p>
                  {room.type === 'group' && (
                    <span className="text-xs text-gray-400 ml-1 flex-shrink-0">{room.members?.length}</span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showSessions && <SessionsModal onClose={() => setShowSessions(false)} />}
    </div>
  );
}

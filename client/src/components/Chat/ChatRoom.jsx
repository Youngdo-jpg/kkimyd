import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import useChatStore from '../../stores/chatStore.js';
import useAuthStore from '../../stores/authStore.js';
import { getSocket } from '../../hooks/useSocket.js';
import MessageBubble from './MessageBubble.jsx';
import MessageInput from './MessageInput.jsx';

export default function ChatRoom() {
  const { roomId } = useParams();
  const { rooms, messages, fetchMessages, getTypingInRoom } = useChatStore();
  const { user } = useAuthStore();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const room = rooms.find(r => r.id === roomId);
  const roomMessages = messages[roomId] || [];
  const typing = getTypingInRoom(roomId);

  useEffect(() => {
    if (!roomId) return;
    fetchMessages(roomId).then(data => {
      setHasMore(data.length === 50);
      scrollToBottom();
    });

    const socket = getSocket();
    if (socket) socket.emit('room:read', { roomId });
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [roomMessages.length]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || roomMessages.length === 0) return;
    setLoadingMore(true);
    const oldest = roomMessages[0]?.createdAt;
    const prev = await fetchMessages(roomId, oldest);
    setHasMore(prev.length === 50);
    setLoadingMore(false);
  }, [loadingMore, hasMore, roomMessages, roomId]);

  const handleScroll = useCallback(() => {
    if (containerRef.current?.scrollTop === 0) loadMore();
  }, [loadMore]);

  const getRoomTitle = () => {
    if (!room) return '';
    if (room.name) return room.name;
    const other = room.members?.find(m => m.userId !== user?.id);
    return other?.user?.username || '채팅방';
  };

  const getMemberCount = () => {
    if (!room) return '';
    if (room.type === 'group') return ` ${room.members?.length}`;
    return '';
  };

  const groupMessages = (msgs) => {
    const groups = [];
    msgs.forEach((msg, i) => {
      const prev = msgs[i - 1];
      const showSender = !prev || prev.senderId !== msg.senderId ||
        new Date(msg.createdAt) - new Date(prev.createdAt) > 5 * 60 * 1000;
      const next = msgs[i + 1];
      const showTime = !next || next.senderId !== msg.senderId ||
        new Date(next.createdAt) - new Date(msg.createdAt) > 60 * 1000;
      groups.push({ ...msg, showSender, showTime });
    });
    return groups;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="w-10 h-10 bg-kakao-yellow rounded-full flex items-center justify-center font-bold text-kakao-brown">
          {getRoomTitle()[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="font-bold text-gray-800 text-sm">
            {getRoomTitle()}
            {room?.type === 'group' && (
              <span className="text-gray-400 font-normal ml-1 text-xs">{getMemberCount()}</span>
            )}
          </h2>
          {room?.type === 'direct' && (
            <p className="text-xs text-gray-400">
              {room.members?.find(m => m.userId !== user?.id)?.user?.status === 'online' ? '온라인' : '오프라인'}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin"
        style={{ backgroundColor: '#B2C8E0' }}
      >
        {loadingMore && (
          <div className="text-center py-2">
            <span className="text-xs text-gray-500">불러오는 중...</span>
          </div>
        )}

        {groupMessages(roomMessages).map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === user?.id}
            showSender={msg.showSender && room?.type === 'group'}
            showTime={msg.showTime}
          />
        ))}

        {typing.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="bg-white rounded-full px-3 py-2 shadow-sm">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <span
                    key={i}
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </div>
            <span className="text-xs text-gray-500">{typing[0].username} 입력 중...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput roomId={roomId} onSend={scrollToBottom} />
    </div>
  );
}

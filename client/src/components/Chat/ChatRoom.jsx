import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import useAuthStore from '../../stores/authStore.js';
import useChatStore from '../../stores/chatStore.js';
import MessageBubble from './MessageBubble.jsx';
import MessageInput from './MessageInput.jsx';

export default function ChatRoom() {
  const { roomId } = useParams();
  const { currentUser } = useAuthStore();
  const { rooms, messages, userCache, subscribeMessages, subscribeTyping, getRoomName, getOtherUser, getTypingInRoom } = useChatStore();
  const bottomRef = useRef(null);
  const subscribed = useRef({});

  const room = rooms.find(r => r.id === roomId);
  const roomMessages = (messages[roomId] || []).filter(m => !m.deleted);
  const typing = getTypingInRoom(roomId);

  useEffect(() => {
    if (!roomId || subscribed.current[roomId]) return;
    subscribed.current[roomId] = true;
    subscribeMessages(roomId);
    subscribeTyping(roomId, currentUser?.pub);
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length]);

  const getRoomTitle = () => {
    if (!room) return '...';
    return getRoomName(room, currentUser?.pub, userCache);
  };

  const otherUser = room ? getOtherUser(room, currentUser?.pub, userCache) : null;
  const memberCount = room?.members ? Object.keys(room.members).length : 0;

  // 연속 메시지 그룹핑
  const grouped = roomMessages.map((msg, i) => {
    const prev = roomMessages[i - 1];
    const next = roomMessages[i + 1];
    const showSender = !prev || prev.senderId !== msg.senderId || msg.createdAt - prev.createdAt > 5 * 60 * 1000;
    const showTime = !next || next.senderId !== msg.senderId || next.createdAt - msg.createdAt > 60 * 1000;
    return { ...msg, showSender, showTime };
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
        <div className="w-10 h-10 bg-kakao-yellow rounded-full flex items-center justify-center font-bold text-kakao-brown text-sm">
          {getRoomTitle()[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="font-bold text-gray-800 text-sm flex items-center gap-1">
            {getRoomTitle()}
            {room?.type === 'group' && (
              <span className="text-gray-400 font-normal text-xs">{memberCount}</span>
            )}
          </h2>
          {room?.type === 'direct' && otherUser && (
            <p className="text-xs text-gray-400">
              {otherUser.status === 'online' ? '🟢 온라인' : '오프라인'}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-thin"
        style={{ backgroundColor: '#B2C8E0' }}
      >
        {roomMessages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500 bg-white/60 px-4 py-2 rounded-full">
              대화를 시작해보세요
            </p>
          </div>
        )}

        {grouped.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === currentUser?.pub}
            showSender={msg.showSender && room?.type === 'group'}
            showTime={msg.showTime}
            senderAlias={userCache[msg.senderId]?.alias || msg.senderId?.slice(0, 6)}
            roomId={roomId}
            myPub={currentUser?.pub}
          />
        ))}

        {typing.length > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="bg-white rounded-full px-3 py-2 shadow-sm">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
            <span className="text-xs text-gray-500">{typing[0]} 입력 중...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput roomId={roomId} myPub={currentUser?.pub} onSend={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })} />
    </div>
  );
}

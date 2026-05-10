import React, { useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';
import useChatStore from '../stores/chatStore.js';
import Sidebar from '../components/Sidebar/Sidebar.jsx';
import ChatRoom from '../components/Chat/ChatRoom.jsx';
import EmptyChat from '../components/Chat/EmptyChat.jsx';

export default function ChatPage() {
  const { currentUser } = useAuthStore();
  const { subscribeRooms } = useChatStore();
  const subscribed = useRef(false);

  useEffect(() => {
    if (!currentUser?.pub || subscribed.current) return;
    subscribed.current = true;
    subscribeRooms(currentUser.pub);
  }, [currentUser?.pub]);

  return (
    <div className="flex w-full h-full overflow-hidden">
      <div className="w-72 flex-shrink-0 bg-white border-r border-gray-100">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <Routes>
          <Route path="/" element={<EmptyChat />} />
          <Route path="/room/:roomId" element={<ChatRoom />} />
        </Routes>
      </div>
    </div>
  );
}

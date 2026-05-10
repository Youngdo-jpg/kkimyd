import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Routes, Route } from 'react-router-dom';
import useChatStore from '../stores/chatStore.js';
import Sidebar from '../components/Sidebar/Sidebar.jsx';
import ChatRoom from '../components/Chat/ChatRoom.jsx';
import EmptyChat from '../components/Chat/EmptyChat.jsx';

export default function ChatPage() {
  const { fetchRooms } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const isMobile = window.innerWidth < 768;

  return (
    <div className="flex w-full h-full overflow-hidden">
      <div className={`${isMobile ? 'w-full' : 'w-80'} flex-shrink-0 bg-white border-r border-gray-100`}>
        <Sidebar onRoomSelect={() => isMobile && setSidebarOpen(false)} />
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

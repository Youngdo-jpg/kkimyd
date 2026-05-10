import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useChatStore from '../stores/chatStore.js';
import useAuthStore from '../stores/authStore.js';

let socketInstance = null;

export function getSocket() {
  return socketInstance;
}

export function useSocket() {
  const { token } = useAuthStore();
  const { addMessage, deleteMessage, setTyping, updateUserStatus } = useChatStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!token || initialized.current) return;
    initialized.current = true;

    socketInstance = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('message:new', (message) => {
      addMessage(message);
      if (document.hidden && Notification.permission === 'granted') {
        new Notification(`${message.sender.username}`, {
          body: message.type === 'text' ? message.content : `📎 ${message.fileName}`,
          icon: '/icon-192.png',
        });
      }
    });

    socketInstance.on('message:deleted', deleteMessage);

    socketInstance.on('typing:start', ({ roomId, userId, username }) => {
      setTyping(roomId, userId, username, true);
      setTimeout(() => setTyping(roomId, userId, username, false), 3000);
    });

    socketInstance.on('typing:stop', ({ roomId, userId }) => {
      setTyping(roomId, userId, '', false);
    });

    socketInstance.on('user:status', ({ userId, status }) => {
      updateUserStatus(userId, status);
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        initialized.current = false;
      }
    };
  }, [token]);

  return socketInstance;
}

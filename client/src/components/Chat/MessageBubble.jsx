import React, { useState } from 'react';
import { format } from 'date-fns';
import { getSocket } from '../../hooks/useSocket.js';

const API_BASE = '';

function FileMessage({ message, isMe }) {
  const isImage = message.fileMime?.startsWith('image/');
  const isVideo = message.fileMime?.startsWith('video/');

  const handleDownload = async () => {
    const filename = message.filePath?.split('/').pop();
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/files/download/${filename}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = message.fileName || filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isImage) {
    return (
      <div className="cursor-pointer" onClick={() => window.open(`${API_BASE}${message.filePath}`, '_blank')}>
        <img
          src={`${API_BASE}${message.filePath}`}
          alt={message.fileName}
          className="max-w-xs max-h-64 rounded-xl object-cover"
          loading="lazy"
        />
        <button
          onClick={e => { e.stopPropagation(); handleDownload(); }}
          className="mt-1 text-xs text-blue-500 hover:underline"
        >
          다운로드
        </button>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div>
        <video
          src={`${API_BASE}${message.filePath}`}
          controls
          className="max-w-xs max-h-64 rounded-xl"
          preload="metadata"
        />
        <button onClick={handleDownload} className="block mt-1 text-xs text-blue-500 hover:underline">
          다운로드
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className={`flex items-center gap-2 p-3 rounded-xl border transition-colors hover:brightness-95 ${
        isMe ? 'bg-kakao-yellow/80 border-kakao-yellow' : 'bg-white border-gray-200'
      }`}
    >
      <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="text-left min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{message.fileName}</p>
        <p className="text-xs text-gray-400">{formatBytes(message.fileSize)}</p>
      </div>
      <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export default function MessageBubble({ message, isMe, showSender, showTime }) {
  const [showMenu, setShowMenu] = useState(false);

  const handleDelete = () => {
    const socket = getSocket();
    if (socket) socket.emit('message:delete', { messageId: message.id });
    setShowMenu(false);
  };

  const handleCopy = () => {
    if (message.content) navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  const timeStr = format(new Date(message.createdAt), 'HH:mm');

  if (isMe) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-end gap-1 group">
          {showTime && <span className="text-xs text-gray-500 mb-0.5">{timeStr}</span>}
          <div className="relative">
            <div
              className="chat-bubble-mine cursor-pointer select-text"
              onContextMenu={e => { e.preventDefault(); setShowMenu(!showMenu); }}
            >
              {message.type === 'text' ? (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              ) : (
                <FileMessage message={message} isMe={isMe} />
              )}
            </div>
            {showMenu && (
              <div className="absolute bottom-full right-0 mb-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-[100px]">
                {message.type === 'text' && (
                  <button onClick={handleCopy} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">복사</button>
                )}
                <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-50">삭제</button>
                <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50">취소</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      {showSender && (
        <span className="text-xs text-gray-500 ml-12 mb-0.5">{message.sender?.username}</span>
      )}
      <div className="flex items-end gap-2 group">
        {showSender ? (
          <div className="w-8 h-8 bg-kakao-yellow rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-kakao-brown">
            {message.sender?.username?.[0]?.toUpperCase()}
          </div>
        ) : (
          <div className="w-8 flex-shrink-0" />
        )}
        <div className="relative">
          <div
            className="chat-bubble-other cursor-pointer select-text"
            onContextMenu={e => { e.preventDefault(); setShowMenu(!showMenu); }}
          >
            {message.type === 'text' ? (
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <FileMessage message={message} isMe={isMe} />
            )}
          </div>
          {showMenu && (
            <div className="absolute bottom-full left-0 mb-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-[100px]">
              {message.type === 'text' && (
                <button onClick={handleCopy} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">복사</button>
              )}
              <button onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50">취소</button>
            </div>
          )}
        </div>
        {showTime && <span className="text-xs text-gray-500 mb-0.5">{timeStr}</span>}
      </div>
    </div>
  );
}

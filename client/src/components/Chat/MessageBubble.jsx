import React, { useState } from 'react';
import { format } from 'date-fns';
import useChatStore from '../../stores/chatStore.js';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function FileMessage({ message }) {
  const isImage = message.fileMime?.startsWith('image/');
  const isVideo = message.fileMime?.startsWith('video/');
  const relayBase = message.fileUrl?.startsWith('/files/') ? (
    JSON.parse(localStorage.getItem('kkimyd_peers') || '[]')[0]?.replace(/\/gun$/, '').replace(/^ws/, 'http') || ''
  ) : '';
  const fileUrl = message.fileUrl?.startsWith('http') ? message.fileUrl : `${relayBase}${message.fileUrl}`;

  const handleDownload = async () => {
    try {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = message.fileName || 'file';
      a.target = '_blank';
      a.click();
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  if (isImage) {
    return (
      <div>
        <img src={fileUrl} alt={message.fileName} className="max-w-xs max-h-56 rounded-xl object-cover cursor-pointer"
          onClick={() => window.open(fileUrl, '_blank')} loading="lazy" />
        <button onClick={handleDownload} className="mt-1 text-xs text-blue-500 hover:underline block">
          💾 다운로드
        </button>
      </div>
    );
  }

  if (isVideo) {
    return (
      <div>
        <video src={fileUrl} controls className="max-w-xs max-h-56 rounded-xl" preload="metadata" />
        <button onClick={handleDownload} className="mt-1 text-xs text-blue-500 hover:underline block">
          💾 다운로드
        </button>
      </div>
    );
  }

  return (
    <button onClick={handleDownload}
      className="flex items-center gap-2 p-3 rounded-xl bg-white/80 border border-gray-200 hover:bg-white transition-colors min-w-[160px]">
      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="text-left min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate max-w-[150px]">{message.fileName}</p>
        <p className="text-xs text-gray-400">{formatBytes(message.fileSize)}</p>
      </div>
      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  );
}

export default function MessageBubble({ message, isMe, showSender, showTime, senderAlias, roomId, myPub }) {
  const [menu, setMenu] = useState(false);
  const { deleteMessage } = useChatStore();
  const timeStr = format(new Date(message.createdAt), 'HH:mm');

  const handleCopy = () => {
    if (message.content) navigator.clipboard.writeText(message.content);
    setMenu(false);
  };

  const handleDelete = () => {
    deleteMessage(roomId, message.id, myPub);
    setMenu(false);
  };

  const bubble = (
    <div className="relative">
      <div
        className={isMe ? 'chat-bubble-mine' : 'chat-bubble-other'}
        onContextMenu={e => { e.preventDefault(); setMenu(m => !m); }}
      >
        {message.type === 'text'
          ? <p className="text-sm whitespace-pre-wrap break-words select-text">{message.content}</p>
          : <FileMessage message={message} />
        }
      </div>
      {menu && (
        <div className={`absolute bottom-full mb-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-[100px] ${isMe ? 'right-0' : 'left-0'}`}>
          {message.type === 'text' && (
            <button onClick={handleCopy} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">복사</button>
          )}
          {isMe && (
            <button onClick={handleDelete} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-50">삭제</button>
          )}
          <button onClick={() => setMenu(false)} className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50">취소</button>
        </div>
      )}
    </div>
  );

  if (isMe) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className="flex items-end gap-1">
          {showTime && <span className="text-xs text-gray-500 mb-0.5">{timeStr}</span>}
          {bubble}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-0.5">
      {showSender && (
        <span className="text-xs text-gray-500 ml-11">{senderAlias}</span>
      )}
      <div className="flex items-end gap-2">
        {showSender ? (
          <div className="w-8 h-8 bg-white rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-kakao-brown shadow-sm">
            {senderAlias?.[0]?.toUpperCase()}
          </div>
        ) : <div className="w-8 flex-shrink-0" />}
        {bubble}
        {showTime && <span className="text-xs text-gray-500 mb-0.5">{timeStr}</span>}
      </div>
    </div>
  );
}

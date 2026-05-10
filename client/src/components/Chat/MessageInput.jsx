import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getSocket } from '../../hooks/useSocket.js';
import api from '../../services/api.js';

export default function MessageInput({ roomId, onSend }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);

  const emitTyping = useCallback((isTyping) => {
    const socket = getSocket();
    if (!socket) return;
    if (isTyping) {
      socket.emit('typing:start', { roomId });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socket.emit('typing:stop', { roomId });
      }, 2000);
    } else {
      socket.emit('typing:stop', { roomId });
    }
  }, [roomId]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (e.target.value) emitTyping(true);
    autoResize();
  };

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const sendText = useCallback(() => {
    const content = text.trim();
    if (!content) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('message:send', { roomId, type: 'text', content }, (res) => {
      if (res?.success) {
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        emitTyping(false);
        onSend?.();
      }
    });
  }, [text, roomId, emitTyping, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await uploadFiles(files);
    e.target.value = '';
  };

  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData.items);
    const fileItems = items.filter(i => i.kind === 'file');
    if (fileItems.length === 0) return;
    e.preventDefault();
    const files = fileItems.map(i => i.getAsFile()).filter(Boolean);
    await uploadFiles(files);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) await uploadFiles(files);
  };

  const uploadFiles = async (files) => {
    const socket = getSocket();
    if (!socket) return;
    setUploading(true);

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post('/files/upload', formData, {
          onUploadProgress: e => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
        });

        const type = file.type.startsWith('image/') ? 'image'
          : file.type.startsWith('video/') ? 'video' : 'file';

        await new Promise((resolve) => {
          socket.emit('message:send', {
            roomId,
            type,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileMime: data.fileMime,
            filePath: data.filePath,
          }, resolve);
        });
      } catch (err) {
        alert(`파일 업로드 실패: ${file.name}`);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    onSend?.();
  };

  const EMOJIS = ['😊','😂','🥰','😎','🤔','👍','❤️','🎉','🔥','✨','😢','😡','🙏','💪','🤣','😅','🤗','😴','🥳','💯'];

  return (
    <div
      className="bg-white border-t border-gray-100"
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
    >
      {uploading && (
        <div className="px-4 py-2 bg-blue-50">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {showEmoji && (
        <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-2">
          {EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => { setText(t => t + emoji); textareaRef.current?.focus(); }}
              className="text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
        <button
          onClick={() => setShowEmoji(s => !s)}
          className="p-2 text-gray-400 hover:text-yellow-500 transition-colors flex-shrink-0"
          title="이모지"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="p-2 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
          title="파일 첨부 (이미지, 동영상, 모든 파일)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
          accept="*/*"
        />

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="메시지 입력... (Shift+Enter: 줄바꿈)"
          rows={1}
          className="flex-1 resize-none border border-gray-200 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kakao-yellow bg-gray-50 max-h-32 overflow-y-auto scrollbar-thin"
        />

        <button
          onClick={sendText}
          disabled={!text.trim() || uploading}
          className="p-2 bg-kakao-yellow text-kakao-brown rounded-full hover:brightness-95 disabled:opacity-40 transition-all flex-shrink-0"
          title="전송"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

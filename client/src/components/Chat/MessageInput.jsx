import React, { useState, useRef, useCallback } from 'react';
import useAuthStore from '../../stores/authStore.js';
import useChatStore from '../../stores/chatStore.js';

export default function MessageInput({ roomId, myPub, onSend }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef(null);
  const { sendMessage, setTyping } = useChatStore();
  const { currentUser } = useAuthStore();

  // 릴레이 서버 URL (파일 업로드용)
  const getRelayHttp = () => {
    const peers = JSON.parse(localStorage.getItem('kkimyd_peers') || '[]');
    if (!peers.length) return null;
    return peers[0].replace(/\/gun$/, '').replace(/^ws/, 'http');
  };

  const emitTyping = useCallback((active) => {
    clearTimeout(typingTimer.current);
    if (active) {
      setTyping(roomId, myPub, currentUser?.alias, true);
      typingTimer.current = setTimeout(() => setTyping(roomId, myPub, currentUser?.alias, false), 2500);
    } else {
      setTyping(roomId, myPub, currentUser?.alias, false);
    }
  }, [roomId, myPub, currentUser?.alias]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    autoResize();
    if (e.target.value) emitTyping(true);
  };

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const doSend = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    emitTyping(false);
    await sendMessage(roomId, myPub, { type: 'text', content });
    onSend?.();
  }, [text, roomId, myPub, emitTyping, sendMessage, onSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  };

  const uploadFiles = async (files) => {
    const relay = getRelayHttp();
    setUploading(true);

    for (const file of files) {
      try {
        if (!relay) {
          alert('파일 전송은 릴레이 피어가 필요합니다.\n릴레이 피어를 설정해주세요.');
          break;
        }
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        const result = await new Promise((resolve, reject) => {
          xhr.upload.onprogress = e => setProgress(Math.round(e.loaded * 100 / e.total));
          xhr.onload = () => resolve(JSON.parse(xhr.responseText));
          xhr.onerror = reject;
          xhr.open('POST', `${relay}/upload`);
          xhr.send(formData);
        });

        const type = file.type.startsWith('image/') ? 'image'
          : file.type.startsWith('video/') ? 'video' : 'file';

        await sendMessage(roomId, myPub, {
          type,
          fileName: result.fileName,
          fileSize: result.fileSize,
          fileMime: result.fileMime,
          fileUrl: result.fileUrl,
        });
      } catch (err) {
        alert(`파일 업로드 실패: ${file.name}`);
      }
    }

    setUploading(false);
    setProgress(0);
    onSend?.();
  };

  const handlePaste = async (e) => {
    const files = Array.from(e.clipboardData.items)
      .filter(i => i.kind === 'file')
      .map(i => i.getAsFile())
      .filter(Boolean);
    if (files.length) { e.preventDefault(); await uploadFiles(files); }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) await uploadFiles(files);
  };

  const EMOJIS = ['😊','😂','🥰','😎','🤔','👍','❤️','🎉','🔥','✨','😢','😡','🙏','💪','🤣','😅','🤗','😴','🥳','💯'];

  return (
    <div className="bg-white border-t border-gray-100 flex-shrink-0"
      onDrop={handleDrop} onDragOver={e => e.preventDefault()}>

      {uploading && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
        </div>
      )}

      {showEmoji && (
        <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-2">
          {EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => { setText(t => t + emoji); textareaRef.current?.focus(); }}
              className="text-xl hover:scale-125 transition-transform active:scale-95">
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-2">
        <button onClick={() => setShowEmoji(s => !s)}
          className="p-2 text-gray-400 hover:text-yellow-500 transition-colors flex-shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="p-2 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
          title="파일 첨부">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input ref={fileRef} type="file" multiple className="hidden"
          onChange={e => { uploadFiles(Array.from(e.target.files || [])); e.target.value = ''; }}
          accept="*/*" />

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

        <button onClick={doSend} disabled={!text.trim() || uploading}
          className="p-2 bg-kakao-yellow text-kakao-brown rounded-full hover:brightness-95 disabled:opacity-40 transition-all flex-shrink-0 active:scale-95">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}

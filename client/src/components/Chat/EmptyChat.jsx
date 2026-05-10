import React from 'react';

export default function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-kakao-bg/30 text-gray-400 gap-3">
      <div className="text-6xl">💬</div>
      <p className="text-lg font-semibold text-gray-500">kkimyd 메신저</p>
      <p className="text-sm">왼쪽에서 채팅을 선택하거나 새 채팅을 시작하세요</p>
    </div>
  );
}

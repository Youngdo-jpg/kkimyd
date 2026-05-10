import React, { useState, useEffect } from 'react';
import api from '../../services/api.js';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function SessionsModal({ onClose }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentDeviceId = localStorage.getItem('deviceId');

  useEffect(() => {
    api.get('/auth/sessions').then(({ data }) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  const terminate = async (id) => {
    if (!confirm('이 기기의 세션을 종료하겠습니까?')) return;
    await api.delete(`/auth/sessions/${id}`);
    setSessions(s => s.filter(x => x.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-gray-800">연결된 기기</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="text-center text-gray-400 py-4">불러오는 중...</p>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <div key={session.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                  session.deviceId === currentDeviceId ? 'border-kakao-yellow bg-yellow-50' : 'border-gray-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">
                        {session.deviceName || '알 수 없는 기기'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(session.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                      </p>
                      {session.deviceId === currentDeviceId && (
                        <span className="text-xs text-kakao-brown font-semibold">현재 기기</span>
                      )}
                    </div>
                  </div>
                  {session.deviceId !== currentDeviceId && (
                    <button
                      onClick={() => terminate(session.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded"
                    >
                      종료
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

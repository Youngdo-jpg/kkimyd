import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';
import PeerSettings from '../components/Common/PeerSettings.jsx';

export default function LoginPage() {
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [showPeers, setShowPeers] = useState(false);
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(alias.trim(), password);
    if (result.success) navigate('/');
  };

  return (
    <div className="min-h-screen bg-kakao-yellow flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💬</div>
          <h1 className="text-2xl font-bold text-kakao-brown">kkimyd</h1>
          <p className="text-gray-400 text-sm mt-1">P2P 크로스 디바이스 메신저</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="아이디"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            className="input-field"
            required
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input-field"
            required
            autoComplete="current-password"
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading} className="btn-kakao">
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-gray-400 text-sm">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-kakao-brown font-semibold hover:underline">
              회원가입
            </Link>
          </p>

          <button
            onClick={() => setShowPeers(true)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mx-auto"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            릴레이 피어 설정
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-600 text-center">
            📱 각 기기가 독립적으로 동작 · P2P 동기화
          </p>
        </div>
      </div>

      {showPeers && <PeerSettings onClose={() => setShowPeers(false)} />}
    </div>
  );
}

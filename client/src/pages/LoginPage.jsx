import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) navigate('/');
  };

  return (
    <div className="min-h-screen bg-kakao-yellow flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💬</div>
          <h1 className="text-2xl font-bold text-kakao-brown">kkimyd</h1>
          <p className="text-gray-400 text-sm mt-1">크로스 디바이스 메신저</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-field"
            required
            autoComplete="email"
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

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-kakao">
            {loading ? '로그인 중...' : '카카오로 시작하기'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-kakao-brown font-semibold hover:underline">
              회원가입
            </Link>
          </p>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-600 text-center">
            📱 여러 기기에서 동시 로그인 지원
          </p>
        </div>
      </div>
    </div>
  );
}

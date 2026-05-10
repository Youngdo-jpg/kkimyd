import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const { register, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      return alert('비밀번호가 일치하지 않습니다.');
    }
    const result = await register(form.username, form.email, form.password);
    if (result.success) {
      alert('회원가입이 완료되었습니다. 로그인해주세요.');
      navigate('/login');
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-kakao-yellow flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💬</div>
          <h1 className="text-2xl font-bold text-kakao-brown">회원가입</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="닉네임"
            value={form.username}
            onChange={set('username')}
            className="input-field"
            required
            minLength={2}
            maxLength={20}
          />
          <input
            type="email"
            placeholder="이메일"
            value={form.email}
            onChange={set('email')}
            className="input-field"
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="비밀번호 (8자 이상)"
            value={form.password}
            onChange={set('password')}
            className="input-field"
            required
            minLength={8}
          />
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={form.confirm}
            onChange={set('confirm')}
            className="input-field"
            required
          />

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading} className="btn-kakao">
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-kakao-brown font-semibold hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

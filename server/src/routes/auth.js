import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: '모든 필드를 입력하세요.' });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      return res.status(409).json({ error: '이미 사용 중인 이메일 또는 아이디입니다.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashed },
    });

    res.status(201).json({ message: '회원가입 완료', userId: user.id });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password, deviceId, deviceName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '이메일과 비밀번호를 입력하세요.' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const did = deviceId || uuidv4();

    await prisma.session.create({
      data: { userId: user.id, token, deviceId: did, deviceName: deviceName || 'Unknown', expiresAt },
    });

    await prisma.user.update({ where: { id: user.id }, data: { status: 'online' } });

    const { password: _, ...safeUser } = user;
    res.json({ token, deviceId: did, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: '서버 오류' });
  }
});

router.post('/logout', authenticate, async (req, res) => {
  await prisma.session.delete({ where: { id: req.sessionId } });

  const remaining = await prisma.session.count({ where: { userId: req.user.id } });
  if (remaining === 0) {
    await prisma.user.update({ where: { id: req.user.id }, data: { status: 'offline' } });
  }

  res.json({ message: '로그아웃 완료' });
});

router.get('/sessions', authenticate, async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.user.id },
    select: { id: true, deviceId: true, deviceName: true, createdAt: true, expiresAt: true },
  });
  res.json(sessions);
});

router.delete('/sessions/:id', authenticate, async (req, res) => {
  const session = await prisma.session.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!session) return res.status(404).json({ error: '세션을 찾을 수 없습니다.' });

  await prisma.session.delete({ where: { id: req.params.id } });
  res.json({ message: '세션 종료 완료' });
});

router.get('/me', authenticate, async (req, res) => {
  const { password, ...safeUser } = req.user;
  res.json(safeUser);
});

export default router;

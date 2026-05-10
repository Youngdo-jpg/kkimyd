import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: req.user.id } } },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, avatar: true, status: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const enriched = rooms.map(room => {
    const myMember = room.members.find(m => m.userId === req.user.id);
    const unreadCount = 0;
    return { ...room, myMember, unreadCount };
  });

  res.json(enriched);
});

router.post('/direct', authenticate, async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) return res.status(400).json({ error: '대상 사용자가 필요합니다.' });

  const existing = await prisma.room.findFirst({
    where: {
      type: 'direct',
      AND: [
        { members: { some: { userId: req.user.id } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, avatar: true, status: true } },
        },
      },
    },
  });

  if (existing) return res.json(existing);

  const room = await prisma.room.create({
    data: {
      type: 'direct',
      members: {
        create: [{ userId: req.user.id }, { userId: targetUserId }],
      },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, avatar: true, status: true } },
        },
      },
    },
  });

  res.status(201).json(room);
});

router.post('/group', authenticate, async (req, res) => {
  const { name, memberIds } = req.body;
  if (!name || !memberIds?.length) {
    return res.status(400).json({ error: '그룹명과 멤버가 필요합니다.' });
  }

  const allIds = [...new Set([req.user.id, ...memberIds])];
  const room = await prisma.room.create({
    data: {
      name,
      type: 'group',
      members: {
        create: allIds.map(userId => ({ userId })),
      },
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, avatar: true, status: true } },
        },
      },
    },
  });

  res.status(201).json(room);
});

router.get('/:id', authenticate, async (req, res) => {
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.id, userId: req.user.id } },
  });
  if (!member) return res.status(403).json({ error: '접근 권한이 없습니다.' });

  const room = await prisma.room.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true, avatar: true, status: true } },
        },
      },
    },
  });

  res.json(room);
});

export default router;

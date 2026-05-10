import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/:roomId', authenticate, async (req, res) => {
  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: req.params.roomId, userId: req.user.id } },
  });
  if (!member) return res.status(403).json({ error: '접근 권한이 없습니다.' });

  const { before, limit = '50' } = req.query;
  const take = Math.min(parseInt(limit), 100);

  const messages = await prisma.message.findMany({
    where: {
      roomId: req.params.roomId,
      deletedAt: null,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    include: {
      sender: { select: { id: true, username: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  await prisma.roomMember.update({
    where: { roomId_userId: { roomId: req.params.roomId, userId: req.user.id } },
    data: { lastRead: new Date() },
  });

  res.json(messages.reverse());
});

export default router;

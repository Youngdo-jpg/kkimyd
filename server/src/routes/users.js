import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/search', authenticate, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: req.user.id } },
        {
          OR: [
            { username: { contains: q } },
            { email: { contains: q } },
          ],
        },
      ],
    },
    select: { id: true, username: true, email: true, avatar: true, status: true },
    take: 20,
  });

  res.json(users);
});

router.get('/:id', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, username: true, email: true, avatar: true, status: true },
  });
  if (!user) return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  res.json(user);
});

export default router;

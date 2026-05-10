import { PrismaClient } from '@prisma/client';
import { authenticateSocket } from '../middleware/auth.js';

const prisma = new PrismaClient();
const onlineUsers = new Map();

export function setupSocket(io) {
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    const userId = socket.user.id;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    await prisma.user.update({ where: { id: userId }, data: { status: 'online' } });
    io.emit('user:status', { userId, status: 'online' });

    const rooms = await prisma.roomMember.findMany({
      where: { userId },
      select: { roomId: true },
    });
    rooms.forEach(({ roomId }) => socket.join(roomId));

    socket.on('message:send', async (data, ack) => {
      const { roomId, type = 'text', content, fileName, fileSize, fileMime, filePath } = data;

      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!member) return ack?.({ error: '권한 없음' });

      const message = await prisma.message.create({
        data: { roomId, senderId: userId, type, content, fileName, fileSize, fileMime, filePath },
        include: { sender: { select: { id: true, username: true, avatar: true } } },
      });

      await prisma.room.update({ where: { id: roomId }, data: { updatedAt: new Date() } });

      io.to(roomId).emit('message:new', message);
      ack?.({ success: true, message });
    });

    socket.on('message:delete', async ({ messageId }, ack) => {
      const message = await prisma.message.findFirst({
        where: { id: messageId, senderId: userId },
      });
      if (!message) return ack?.({ error: '권한 없음' });

      await prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date() },
      });

      io.to(message.roomId).emit('message:deleted', { messageId, roomId: message.roomId });
      ack?.({ success: true });
    });

    socket.on('room:read', async ({ roomId }) => {
      const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!member) return;

      await prisma.roomMember.update({
        where: { roomId_userId: { roomId, userId } },
        data: { lastRead: new Date() },
      });

      socket.to(roomId).emit('room:read', { roomId, userId });
    });

    socket.on('typing:start', ({ roomId }) => {
      socket.to(roomId).emit('typing:start', { roomId, userId, username: socket.user.username });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(roomId).emit('typing:stop', { roomId, userId });
    });

    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          await prisma.user.update({ where: { id: userId }, data: { status: 'offline' } });
          io.emit('user:status', { userId, status: 'offline' });
        }
      }
    });
  });
}

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const prisma = new PrismaClient();

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '524288000') },
});

router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileMime: req.file.mimetype,
    filePath: fileUrl,
    storedName: req.file.filename,
  });
});

router.get('/download/:filename', authenticate, async (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
  }

  const message = await prisma.message.findFirst({
    where: { filePath: `/uploads/${filename}` },
    include: { room: { include: { members: { where: { userId: req.user.id } } } } },
  });

  if (!message || message.room.members.length === 0) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }

  const originalName = message.fileName || filename;
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalName)}`);
  res.setHeader('Content-Type', message.fileMime || 'application/octet-stream');
  res.sendFile(filePath);
});

export default router;

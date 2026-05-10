/**
 * kkimyd 릴레이 피어
 *
 * 이 서버는 "중앙 서버"가 아닙니다.
 * - Gun.js P2P 네트워크의 릴레이 노드 역할만 합니다.
 * - 데이터는 각 기기의 로컬에 저장되고, 릴레이는 라우팅만 합니다.
 * - 어느 PC든 이 relay를 실행하면 피어가 됩니다.
 * - 폰/태블릿은 브라우저로 접속해서 동등한 피어로 참여합니다.
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Gun = require('gun');

const app = express();
const PORT = process.env.PORT || 8765;
const UPLOAD_DIR = path.join(__dirname, 'uploads');

app.use(cors({ origin: '*' }));
app.use(Gun.serve);
app.use('/files', express.static(UPLOAD_DIR));

// 파일 릴레이 (파일 데이터는 크기 때문에 별도 HTTP로 처리)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({
    fileName: req.file.originalname,
    fileSize: req.file.size,
    fileMime: req.file.mimetype,
    fileUrl: `/files/${req.file.filename}`,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', peer: true, port: PORT });
});

const server = http.createServer(app);

// Gun 릴레이 피어 초기화
// - 데이터를 radata 폴더에 영구 저장 (이 피어가 오프라인인 기기의 메시지를 버퍼링)
const gun = Gun({
  web: server,
  file: path.join(__dirname, 'radata'),
  multicast: false,
});

server.listen(PORT, () => {
  const ifaces = require('os').networkInterfaces();
  const ips = Object.values(ifaces)
    .flat()
    .filter(i => i.family === 'IPv4' && !i.internal)
    .map(i => i.address);

  console.log('\n========================================');
  console.log('  kkimyd 릴레이 피어 실행 중');
  console.log('========================================');
  console.log(`  로컬:    http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  네트워크: http://${ip}:${PORT}`));
  console.log('\n  다른 기기에서 이 주소를 릴레이로 등록하세요.');
  console.log('  Gun.js 릴레이 주소: ws://<위IP>:' + PORT + '/gun');
  console.log('========================================\n');
});

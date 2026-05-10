// Script to generate placeholder icons - run with node
// In production, replace with actual app icons
const { createCanvas } = require('canvas');
const fs = require('fs');

function createIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FEE500';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#3C1E1E';
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', size / 2, size / 2);
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
}

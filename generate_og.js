import fs from 'fs';
import { createCanvas } from 'canvas';

const width = 1200;
const height = 630;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// background
ctx.fillStyle = '#111110';
ctx.fillRect(0, 0, width, height);

// grid background (Terminal vibe)
ctx.strokeStyle = '#1c1c1a';
ctx.lineWidth = 2;
for (let i = 0; i < width; i += 40) {
  ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke();
}
for (let j = 0; j < height; j += 40) {
  ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(width, j); ctx.stroke();
}

// terminal box
const boxX = 200;
const boxY = 120;
const boxW = 800;
const boxH = 400;

ctx.fillStyle = '#1c1c1a';
ctx.shadowColor = 'rgba(74, 127, 181, 0.15)';
ctx.shadowBlur = 40;
ctx.beginPath();
ctx.roundRect(boxX, boxY, boxW, boxH, 12);
ctx.fill();

ctx.shadowColor = 'transparent';
ctx.shadowBlur = 0;
ctx.strokeStyle = '#2a2a27';
ctx.lineWidth = 1;
ctx.stroke();

// terminal header
ctx.fillStyle = '#111110';
ctx.beginPath();
ctx.roundRect(boxX, boxY, boxW, 40, { tl: 12, tr: 12, bl: 0, br: 0 });
ctx.fill();
ctx.stroke();

// dots
ctx.fillStyle = '#c45050'; ctx.beginPath(); ctx.arc(boxX + 24, boxY + 20, 6, 0, Math.PI * 2); ctx.fill();
ctx.fillStyle = '#c4a350'; ctx.beginPath(); ctx.arc(boxX + 44, boxY + 20, 6, 0, Math.PI * 2); ctx.fill();
ctx.fillStyle = '#5faf5f'; ctx.beginPath(); ctx.arc(boxX + 64, boxY + 20, 6, 0, Math.PI * 2); ctx.fill();

// title
ctx.fillStyle = '#6b6963';
ctx.font = '16px "Fira Code", monospace';
ctx.textAlign = 'center';
ctx.fillText('ruby-tools — ruby@home:~', boxX + boxW / 2, boxY + 25);

// text content
ctx.textAlign = 'left';
ctx.font = '24px "Fira Code", monospace';
ctx.fillStyle = '#4a7fb5'; // accent
ctx.fillText('ruby@home ~ $ ', boxX + 40, boxY + 100);

ctx.fillStyle = '#eeece8'; // heading
ctx.fillText('ruby-tools --rmbg', boxX + 240, boxY + 100);

ctx.font = 'bold 64px "Space Grotesk", sans-serif';
ctx.fillStyle = '#eeece8';
ctx.fillText('Ruby Tools', boxX + 40, boxY + 200);

ctx.font = '32px "Space Grotesk", sans-serif';
ctx.fillStyle = '#4a7fb5';
ctx.fillText('Free AI Background Remover', boxX + 40, boxY + 260);

ctx.font = '24px "Fira Code", monospace';
ctx.fillStyle = '#b5b3ad';
ctx.fillText('✓ RMBG v2.0  ✓ Batch Processing  ✓ Local Fallback', boxX + 40, boxY + 340);

// ascii art right side
ctx.font = '16px "Fira Code", monospace';
ctx.fillStyle = '#4a7fb5';
ctx.fillText('┌──────────────┐', boxX + 540, boxY + 200);
ctx.fillText('│ ╭──────────╮ │', boxX + 540, boxY + 230);
ctx.fillText('│ │ rmbg v2  │ │', boxX + 540, boxY + 260);
ctx.fillText('│ ╰──────────╯ │', boxX + 540, boxY + 290);
ctx.fillText('└──────────────┘', boxX + 540, boxY + 320);

const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/og-image.png', buffer);
console.log('og-image.png created');

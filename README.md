# rmbg — Remove Background

AI background removal website dengan terminal-styled UI.

## Fitur

- Upload multi-file (drag & drop)
- AI background removal via Pixa
- Side-by-side preview (original vs result)
- Download individual atau semua sekaligus
- Responsive, mobile-friendly
- Terminal/Linux aesthetic UI

## Deploy ke Home Server

### 1. Clone repo

```bash
git clone https://github.com/bluebleaze/rmbg.git
cd rmbg
```

### 2. Install dependencies

```bash
npm install
```

### 3. Jalankan

```bash
# test
node server.js

# production (pm2)
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Server jalan di `http://localhost:3456`

### 4. Expose ke public

**Cloudflare Tunnel (recommended):**

```bash
# quick test (URL random)
cloudflared tunnel --url http://localhost:3456

# persistent (pm2)
pm2 start cloudflared -- tunnel --url http://localhost:3456
pm2 save
```

## Struktur

```
rmbg/
├── index.html              ← main page
├── public/
│   ├── style.css           ← styling
│   └── script.js           ← frontend logic
├── server.js               ← Express proxy + static server
├── package.json
├── ecosystem.config.cjs    ← pm2 config
└── .gitignore
```

## Tech Stack

- Express.js (server + static hosting)
- Pixa AI API (background removal)
- Vanilla JS (no framework)

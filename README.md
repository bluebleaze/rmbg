<p align="center">
  <img src="public/favicon.svg" width="64" height="64" alt="rmbg logo">
</p>

<h1 align="center">⟩_✂ rmbg</h1>

<p align="center">AI background removal web app with a Linux terminal aesthetic.</p>

<p align="center">
  <em>Originally built as a feature for the popular WhatsApp Baileys bot <b>Ruby</b>, now extracted into a standalone, multi-file web app.</em>
</p>

## Features

- **Multi-file Upload** (drag & drop support)
- **AI Background Removal** powered by Pixa
- **Side-by-side Preview** (original vs result)
- **Batch Download** or individual file saving
- **Responsive** mobile-friendly layout
- **Terminal Aesthetic** (Monospace fonts, CLI prompt vibes)

## Deploy to Vercel (Serverless / Free)

The easiest way to deploy without a home server.

1. Push this repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) using your GitHub account.
3. Import the repository.
4. Vercel will automatically host the frontend and use the `/api/removebg.js` file as a serverless backend function.

---

## Deploy to a Home Server (Self-hosted)

### 1. Clone the repository

```bash
git clone https://github.com/bluebleaze/rmbg.git
cd rmbg
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run the server

```bash
# quick test
node server.js

# production (using pm2)
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

The server runs on `http://localhost:3456`.

### 4. Expose to the public

**Using Cloudflare Tunnel (recommended):**

```bash
# quick test (random URL)
cloudflared tunnel --url http://localhost:3456

# persistent (run alongside pm2)
pm2 start cloudflared -- tunnel --url http://localhost:3456
pm2 save
```

## Project Structure

```text
rmbg/
├── index.html              ← main frontend page
├── public/
│   ├── style.css           ← terminal UI styling
│   ├── script.js           ← frontend logic & queue handling
│   └── favicon.svg         
├── server.js               ← Express proxy (bypasses CORS) & static server
├── package.json            
├── ecosystem.config.cjs    ← pm2 auto-restart config
└── .gitignore              
```

## Tech Stack

- **Express.js** (backend proxy + static hosting)
- **Pixa AI API** (background removal engine)
- **Vanilla JS & CSS** (zero frontend frameworks)

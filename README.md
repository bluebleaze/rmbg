<p align="center">
  <img src="public/favicon.svg" width="64" height="64" alt="ruby-tools logo">
</p>

<h1 align="center">⟩_⚙ ruby-tools</h1>

<p align="center">AI image utility web app with a Linux terminal aesthetic.</p>

<p align="center">
  <em>Originally built as a feature for the popular WhatsApp Baileys bot <b>Ruby</b>, now extracted into a standalone, multi-file web app.</em>
</p>

## Tools Included

- **--rmbg** (Background Removal): Remove image backgrounds using Pixa AI or local on-device fallback (Transformers.js).
- **--hd** (Image Enhancer): *[COMING SOON]* Upscale and enhance image quality. (Currently disabled due to upstream API instability).

## Features

- **Multi-file Upload** (drag & drop support)
- **Side-by-side Preview** (original vs result)
- **Batch Download** or individual file saving
- **Responsive** mobile-friendly layout
- **Terminal Aesthetic** (Monospace fonts, dynamic CLI prompt vibes)

## Deploy to Vercel (Serverless / Free)

The easiest way to deploy without a home server.

1. Push this repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) using your GitHub account.
3. Import the repository.
4. Vercel will automatically host the frontend and use the `/api/` files as serverless backend functions.

---

## Deploy to a Home Server (Self-hosted)

### 1. Clone the repository

```bash
git clone https://github.com/bluebleaze/ruby-tools.git
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
ruby-tools/
├── index.html              ← main frontend page
├── public/
│   ├── style.css           ← terminal UI styling
│   ├── script.js           ← frontend logic & queue handling
│   └── favicon.svg         
├── api/                    ← Vercel serverless functions
│   ├── removebg.js
│   └── enhance.js
├── server.js               ← Express proxy (bypasses CORS) & static server
├── vercel.json             ← Vercel routing config
├── package.json            
├── ecosystem.config.cjs    ← pm2 auto-restart config
└── .gitignore              
```

## Tech Stack

- **Express.js / Vercel** (backend proxy + static hosting)
- **Pixa AI API & Betabotz** (image processing engines)
- **Transformers.js** (on-device local fallback)
- **Vanilla JS & CSS** (zero frontend frameworks)

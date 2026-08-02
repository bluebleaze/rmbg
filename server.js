import express from 'express'
import multer from 'multer'
import fetch from 'node-fetch'
import FormData from 'form-data'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } })

const PORT = process.env.PORT || 3456

// security headers
app.use(helmet({
  contentSecurityPolicy: false, // allow cdn fonts
  crossOriginEmbedderPolicy: false
}))
app.disable('x-powered-by')

// api rate limiting: 30 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many requests, try again later' }
})

// serve frontend - explicitly block sensitive files
const blocklist = ['.env', '.git', 'server.js', 'package.json', 'package-lock.json', 'ecosystem.config.cjs', 'vercel.json']
app.use((req, res, next) => {
  const path = req.path.toLowerCase()
  if (blocklist.some(b => path.includes(b))) {
    return res.status(403).end()
  }
  next()
})
app.use(express.static(join(__dirname, '.')))

// proxy remove bg
app.post('/api/removebg', apiLimiter, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no image' })

  try {
    const form = new FormData()
    form.append('image', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    })
    form.append('format', 'png')
    form.append('model', 'v1')

    const r = await fetch('https://api2.pixelcut.app/image/matte/v1', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'x-locale': 'en',
        'x-client-version': 'web:pixa.com:4a5b0af2',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'origin': 'https://www.pixa.com',
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://www.pixa.com/',
        ...form.getHeaders()
      },
      body: form
    })

    if (!r.ok) {
      return res.status(r.status).json({ error: 'upstream error ' + r.status })
    }

    const buf = Buffer.from(await r.arrayBuffer())
    res.set('Content-Type', 'image/png')
    res.set('Content-Length', buf.length)
    res.send(buf)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// proxy enhance hd
app.post('/api/enhance', apiLimiter, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no image' })

  let finalImageUrl = '';

  try {
    try {
      finalImageUrl = await enhanceViaImgUpscaler(req.file.buffer);
    } catch (primaryErr) {
      console.log('ImgUpscaler API failed', primaryErr.message);
      throw primaryErr;
    }

    // 3. Download result
    const finalImageRes = await fetch(finalImageUrl);
    if (!finalImageRes.ok) throw new Error('Download enhanced failed');

    const resultBuffer = Buffer.from(await finalImageRes.arrayBuffer());
    
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Length', resultBuffer.length);
    res.send(resultBuffer);
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// proxy tiktok downloader
app.post('/api/tiktok', apiLimiter, express.json(), async (req, res) => {
  const { url } = req.body || {}
  if (!url || !/tiktok|douyin/.test(url)) {
    return res.status(400).json({ error: 'Invalid TikTok URL' })
  }

  try {
    const [tikwm, oembed] = await Promise.all([
      fetch('https://www.tikwm.com/api/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
          'Referer': 'https://www.tikwm.com/',
          'Cookie': 'current_language=en',
        },
        body: new URLSearchParams({ url, count: 12, cursor: 0, web: 1, hd: 1 }),
      }),
      fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url), {
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36' },
      }).then(r => r.ok ? r.json() : {}).catch(() => ({})),
    ])
    if (!tikwm.ok) throw new Error('tikwm ' + tikwm.status)
    const json = await tikwm.json()
    if (json.code !== 0 || !json.data) throw new Error(json.msg || 'tikwm fail')

    const d = json.data
    const author = d.author || {}
    const result = {
      title: d.title || '',
      duration: d.duration || 0,
      author: { nickname: author.nickname || '', unique_id: author.unique_id || '', avatar: author.avatar || '' },
      stats: { views: d.play_count || 0, likes: d.digg_count || 0, comments: d.comment_count || 0, shares: d.share_count || 0 },
      music: d.music_info?.play || d.music || '',
      music_title: d.music_info?.title || '',
      cover: d.cover ? (d.cover.startsWith('http') ? d.cover : 'https://www.tikwm.com' + d.cover) : '',
      media: [],
    }

    if (d.images && d.images.length > 0) {
      for (const img of d.images) result.media.push({ type: 'photo', url: img })
    } else {
      if (d.play) result.media.push({ type: 'nowatermark', url: 'https://www.tikwm.com' + d.play })
      if (d.hdplay) result.media.push({ type: 'nowatermark_hd', url: 'https://www.tikwm.com' + d.hdplay })
      if (d.wmplay) result.media.push({ type: 'watermark', url: 'https://www.tikwm.com' + d.wmplay })
    }

    if (oembed.thumbnail_url) result.cover = oembed.thumbnail_url

    res.json({ ok: true, result })
  } catch (e) {
    console.error('[tiktok]', e)
    res.status(500).json({ error: e.message })
  }
})

// proxy tiktok media download (avoid CORS)
app.get('/api/tiktok-proxy', apiLimiter, async (req, res) => {
  const target = req.query.url
  if (!target) return res.status(400).json({ error: 'no url' })

  try {
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://www.tikwm.com/',
      },
    })
    if (!r.ok) throw new Error('proxy ' + r.status)

    const ct = r.headers.get('content-type') || 'application/octet-stream'
    res.set('Content-Type', ct)
    const buf = Buffer.from(await r.arrayBuffer())
    res.set('Content-Length', buf.length)
    res.send(buf)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`ruby-tools server listening on :${PORT}`)
})

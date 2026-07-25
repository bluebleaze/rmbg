import express from 'express'
import multer from 'multer'
import fetch from 'node-fetch'
import FormData from 'form-data'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } })

const PORT = process.env.PORT || 3456

// ponytail: no rate limiting yet, add when abuse happens

// serve frontend
app.use(express.static(join(__dirname, '.')))

// health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

// proxy remove bg
app.post('/api/removebg', upload.single('image'), async (req, res) => {
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
      console.error('pixelcut error:', r.status)
      return res.status(r.status).json({ error: 'upstream error ' + r.status })
    }

    const buf = Buffer.from(await r.arrayBuffer())
    res.set('Content-Type', 'image/png')
    res.set('Content-Length', buf.length)
    res.send(buf)
  } catch (e) {
    console.error('proxy error:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`rmbg server listening on :${PORT}`)
})

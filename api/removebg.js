import fetch from 'node-fetch';
import FormData from 'form-data';
import busboy from 'busboy';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const bb = busboy({ headers: req.headers });
    let imageBuffer = null;
    let fileName = 'image.jpg';
    let mimeType = 'image/jpeg';

    bb.on('file', (name, file, info) => {
      fileName = info.filename;
      mimeType = info.mimeType;
      const chunks = [];
      file.on('data', (data) => chunks.push(data));
      file.on('end', () => {
        imageBuffer = Buffer.concat(chunks);
      });
    });

    const parsed = new Promise((resolve, reject) => {
      bb.on('close', resolve);
      bb.on('error', reject);
    });

    req.pipe(bb);
    await parsed;

    if (!imageBuffer) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: fileName,
      contentType: mimeType,
    });
    form.append('format', 'png');
    form.append('model', 'v1');

    const response = await fetch('https://api2.pixelcut.app/image/matte/v1', {
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
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Upstream API error' });
    }

    const resultBuffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', resultBuffer.length);
    res.send(resultBuffer);
  } catch (error) {
    console.error('Vercel API error:', error);
    res.status(500).json({ error: error.message });
  }
}
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: 'no url' });

  try {
    const r = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://www.tikwm.com/',
      },
    });
    if (!r.ok) throw new Error('proxy ' + r.status);

    const ct = r.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', ct);
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Content-Disposition', 'attachment');
    res.send(buf);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

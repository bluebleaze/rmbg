import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: true,
  },
};

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36';

async function fetchTikWM(url) {
  const r = await fetch('https://www.tikwm.com/api/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      'Referer': 'https://www.tikwm.com/',
      'Cookie': 'current_language=en',
    },
    body: new URLSearchParams({ url, count: 12, cursor: 0, web: 1, hd: 1 }),
  });
  if (!r.ok) throw new Error('tikwm ' + r.status);
  const json = await r.json();
  if (json.code !== 0 || !json.data) throw new Error(json.msg || 'tikwm fail');
  return json.data;
}

async function fetchOembedCover(url) {
  try {
    const r = await fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url), {
      headers: { 'User-Agent': UA },
    });
    if (!r.ok) return '';
    const json = await r.json();
    return json.thumbnail_url || '';
  } catch {
    return '';
  }
}

function buildResult(data) {
  const author = data.author || {};
  const stats = {
    views: data.play_count || 0,
    likes: data.digg_count || 0,
    comments: data.comment_count || 0,
    shares: data.share_count || 0,
  };

  const result = {
    title: data.title || '',
    duration: data.duration || 0,
    author: {
      nickname: author.nickname || '',
      unique_id: author.unique_id || '',
      avatar: author.avatar || '',
    },
    stats,
    music: data.music_info?.play || data.music || '',
    music_title: data.music_info?.title || '',
    media: [],
  };

  // slides/images
  if (data.images && data.images.length > 0) {
    for (const img of data.images) {
      result.media.push({ type: 'photo', url: img });
    }
  } else {
    // video - SD first (stable), then HD, then watermark
    if (data.play) {
      result.media.push({ type: 'nowatermark', url: 'https://www.tikwm.com' + data.play });
    }
    if (data.hdplay) {
      result.media.push({ type: 'nowatermark_hd', url: 'https://www.tikwm.com' + data.hdplay });
    }
    if (data.wmplay) {
      result.media.push({ type: 'watermark', url: 'https://www.tikwm.com' + data.wmplay });
    }
  }

  // cover
  if (data.cover) {
    result.cover = data.cover.startsWith('http') ? data.cover : 'https://www.tikwm.com' + data.cover;
  }

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body || {};
  if (!url || !/tiktok|douyin/.test(url)) {
    return res.status(400).json({ error: 'Invalid TikTok URL' });
  }

  try {
    const [data, oembedCover] = await Promise.all([
      fetchTikWM(url),
      fetchOembedCover(url),
    ]);
    const result = buildResult(data);
    if (oembedCover) result.cover = oembedCover;
    return res.status(200).json({ ok: true, result });
  } catch (e) {
    console.error('[tiktok api]', e);
    return res.status(500).json({ error: e.message });
  }
}

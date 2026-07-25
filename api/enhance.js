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

    // Step 1: Upload to catbox (or similar temporary host) to get a URL
    const uploadForm = new FormData();
    uploadForm.append('reqtype', 'fileupload');
    uploadForm.append('fileToUpload', imageBuffer, {
      filename: fileName,
      contentType: mimeType,
    });

    const uploadRes = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: uploadForm
    });

    if (!uploadRes.ok) {
       throw new Error('Failed to upload image to temp host for processing');
    }

    const tempImageUrl = await uploadRes.text();

    // Step 2: Send to Betabotz Remini API
    const encodedUrl = encodeURIComponent(tempImageUrl);
    // Note: Using the provided fallback apikey from the prompt
    const apiUrl = `https://api.betabotz.eu.org/api/tools/remini?url=${encodedUrl}&apikey=Btz-Flores`;

    const enhanceRes = await fetch(apiUrl);
    const enhanceData = await enhanceRes.json();

    if (!enhanceData.status || !enhanceData.url) {
      throw new Error(`Enhance API error: ${enhanceData.message || 'Unknown error'}`);
    }

    // Step 3: Fetch the enhanced image
    const finalImageRes = await fetch(enhanceData.url);
    if (!finalImageRes.ok) {
      throw new Error('Failed to download enhanced image');
    }

    const resultBuffer = Buffer.from(await finalImageRes.arrayBuffer());
    
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', resultBuffer.length);
    res.send(resultBuffer);

  } catch (error) {
    console.error('Enhance API error:', error);
    res.status(500).json({ error: error.message });
  }
}

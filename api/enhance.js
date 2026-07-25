import fetch from 'node-fetch';
import FormData from 'form-data';
import busboy from 'busboy';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};

// --- ImgUpscaler Free Fallback Logic ---
function genserial() {
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

async function upimageFree(buffer, ext = 'jpg') {
  const form = new FormData();
  form.append('file_name', `image_${Date.now()}.${ext}`);

  const res = await axios.post('https://api.imgupscaler.ai/api/common/upload/upload-image', form, {
    headers: {
      ...form.getHeaders(),
      origin: 'https://imgupscaler.ai',
      referer: 'https://imgupscaler.ai/'
    }
  });

  const uploadInfo = res.data.result;
  await axios.put(uploadInfo.url, buffer, {
    headers: {
      'Content-Type': ext === 'png' ? 'image/png' : 'image/jpeg',
      'Content-Length': buffer.length
    },
    maxBodyLength: Infinity
  });

  return 'https://cdn.imgupscaler.ai/' + uploadInfo.object_name;
}

async function enhanceViaImgUpscaler(buffer) {
  const cdnUrl = await upimageFree(buffer);
  await new Promise(r => setTimeout(r, 4000));

  const form = new FormData();
  form.append('model_name', 'magiceraser_v4');
  form.append('original_image_url', cdnUrl);
  form.append('prompt', 'masterpiece, best quality, ultra high resolution, sharp details, realistic, clean face, 8k');
  form.append('ratio', 'match_input_image');
  form.append('output_format', 'jpg');

  const createRes = await axios.post('https://api.magiceraser.org/api/magiceraser/v2/image-editor/create-job', form, {
    headers: {
      ...form.getHeaders(),
      'product-code': 'magiceraser',
      'product-serial': genserial(),
      origin: 'https://imgupscaler.ai',
      referer: 'https://imgupscaler.ai/'
    }
  });

  const jobId = createRes.data.result.job_id;
  let result;
  let attempts = 0;
  do {
    await new Promise(r => setTimeout(r, 3000));
    const checkRes = await axios.get(`https://api.magiceraser.org/api/magiceraser/v1/ai-remove/get-job/${jobId}`, {
      headers: {
        origin: 'https://imgupscaler.ai',
        referer: 'https://imgupscaler.ai/'
      }
    });
    result = checkRes.data;
    attempts++;
  } while (result && result.code === 300006 && attempts < 15);

  if (!result || !result.result || !result.result.output_url || !result.result.output_url.length) {
    throw new Error('ImgUpscaler API timeout / error.');
  }

  return result.result.output_url[0];
}
// ----------------------------------------

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

    let finalImageUrl = '';

    try {
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
      const apiUrl = `https://api.betabotz.eu.org/api/tools/remini?url=${encodedUrl}&apikey=Btz-Flores`;

      const enhanceRes = await fetch(apiUrl);
      const enhanceData = await enhanceRes.json();

      if (!enhanceData.status || !enhanceData.url || enhanceData.url.endsWith('.bin')) {
        throw new Error(`Betabotz API error or invalid output`);
      }
      
      finalImageUrl = enhanceData.url;
    } catch (primaryErr) {
      console.log('Betabotz failed, switching to ImgUpscaler fallback...', primaryErr.message);
      
      // FALLBACK TO IMGUPSCALER FREE
      try {
        finalImageUrl = await enhanceViaImgUpscaler(imageBuffer);
      } catch (fallbackErr) {
        console.error('ImgUpscaler fallback also failed:', fallbackErr.message);
        throw new Error('All enhance APIs failed');
      }
    }

    // Step 3: Fetch the enhanced image
    const finalImageRes = await fetch(finalImageUrl);
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

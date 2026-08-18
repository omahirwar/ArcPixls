import { list } from '@vercel/blob';

function getBlobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN.trim() !== '') {
    return process.env.BLOB_READ_WRITE_TOKEN.trim();
  }
  if (process.env.VERCEL_BLOB_READ_WRITE_TOKEN && process.env.VERCEL_BLOB_READ_WRITE_TOKEN.trim() !== '') {
    return process.env.VERCEL_BLOB_READ_WRITE_TOKEN.trim();
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value.startsWith('vercel_blob_rw_')) {
      return value.trim();
    }
    if (key.endsWith('_READ_WRITE_TOKEN') && typeof value === 'string' && value.length > 10) {
      return value.trim();
    }
  }
  return undefined;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const blobToken = getBlobToken();
    let textContent = '';

    if (blobToken) {
      const response = await list({
        prefix: 'whitelist/',
        token: blobToken,
      });

      const wallets = (response.blobs || []).map((b) => {
        return b.pathname.replace(/^whitelist\//, '').replace(/\.json$/, '');
      });

      textContent = wallets.join('\n');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="whitelisted_wallets.txt"');
    return res.status(200).send(textContent);
  } catch (err: any) {
    console.error('Download Whitelist Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate whitelist download file.' });
  }
}

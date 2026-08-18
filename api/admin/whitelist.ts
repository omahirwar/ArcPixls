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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res.status(500).json({ error: 'ADMIN_SECRET not configured' });
  }

  let keyParam: string | null = null;
  if (req.query && typeof req.query.key === 'string') {
    keyParam = req.query.key;
  } else if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      keyParam = parsedUrl.searchParams.get('key');
    } catch {
      keyParam = null;
    }
  }

  if (!keyParam || keyParam !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const blobToken = getBlobToken();
    if (!blobToken) {
      return res.status(200).json({ count: 0, wallets: [] });
    }

    const response = await list({
      prefix: 'whitelist/',
      token: blobToken,
    });

    const wallets = (response.blobs || []).map((b) => {
      const cleanName = b.pathname.replace(/^whitelist\//, '').replace(/\.json$/, '');
      return {
        wallet: cleanName,
        submittedAt: b.uploadedAt ? new Date(b.uploadedAt).toISOString() : new Date().toISOString(),
      };
    });

    wallets.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return res.status(200).json({
      count: wallets.length,
      wallets,
    });
  } catch (err: any) {
    console.error('Admin Whitelist Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve whitelist records.' });
  }
}

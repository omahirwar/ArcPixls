import { getWhitelistedWallets } from '../../lib/db.js';

/**
 * Serverless API handler to retrieve admin whitelist records.
 * Secured via ADMIN_SECRET environment variable and `?key=` query parameter.
 */
export default async function handler(req: any, res: any) {
  // Preserve CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Check if ADMIN_SECRET environment variable is set
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 2. Extract key from query parameters (supports Vercel req.query or req.url fallback)
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

  // 3. Verify key query parameter matches ADMIN_SECRET
  if (!keyParam || keyParam !== adminSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 4. Authorized: Return whitelist JSON
  try {
    const data = await getWhitelistedWallets();
    return res.status(200).json({
      count: data.count,
      wallets: data.wallets.map((w) => ({
        wallet: w.wallet,
        submittedAt: w.submittedAt,
      })),
    });
  } catch (err) {
    console.error('Admin Whitelist Error:', err);
    return res.status(500).json({ error: 'Failed to retrieve whitelist records from Neon PostgreSQL.' });
  }
}


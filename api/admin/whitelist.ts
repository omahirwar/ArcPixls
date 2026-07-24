import { getWhitelistedWallets } from '../../lib/db.js';

export default async function handler(req: any, res: any) {
  // Preserve CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const data = await getWhitelistedWallets();
      return res.status(200).json({
        count: data.count,
        wallets: data.wallets.map(w => ({
          wallet: w.wallet,
          submittedAt: w.submittedAt
        }))
      });
    } catch (err) {
      console.error('Admin Whitelist Error:', err);
      return res.status(500).json({ error: 'Failed to retrieve whitelist records from Neon PostgreSQL.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

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
      const { wallets } = await getWhitelistedWallets();

      let csv = 'Wallet Address,Submitted At\n';
      wallets.forEach((r) => {
        csv += `"${r.wallet}","${r.submittedAt}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="onchainapp_whitelisted_wallets.csv"');
      return res.status(200).send(csv);
    } catch (err) {
      console.error('CSV Download Error:', err);
      return res.status(500).json({ error: 'Failed to generate CSV download from Neon PostgreSQL.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

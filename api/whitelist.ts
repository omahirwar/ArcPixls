import { insertWallet, getWhitelistedWallets, EVM_REGEX } from '../lib/db';

export default async function handler(req: any, res: any) {
  // Preserve CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST: Register a new EVM wallet in Neon PostgreSQL
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          body = {};
        }
      }

      const wallet = typeof body?.wallet === 'string' ? body.wallet.trim() : '';

      // Validate EVM wallet address format
      if (!EVM_REGEX.test(wallet)) {
        return res.status(400).json({ error: 'Enter a valid EVM address (0x followed by 40 hex characters).' });
      }

      // Insert into Neon PostgreSQL
      const record = await insertWallet(wallet);

      // Get updated count
      const { count } = await getWhitelistedWallets();

      return res.status(201).json({
        ok: true,
        submittedAt: record.submittedAt,
        total: count,
      });
    } catch (err: any) {
      if (err.message === 'DUPLICATE_WALLET' || err.code === '23505') {
        return res.status(409).json({ error: 'This wallet was already submitted.' });
      }
      if (err.message === 'INVALID_ADDRESS') {
        return res.status(400).json({ error: 'Enter a valid EVM address (0x followed by 40 hex characters).' });
      }
      console.error('Error inserting wallet into Neon PostgreSQL:', err);
      return res.status(500).json({ error: 'Database error while saving wallet submission.' });
    }
  }

  // GET: Fetch all whitelisted wallets ordered by submitted_at DESC
  if (req.method === 'GET') {
    try {
      const data = await getWhitelistedWallets();
      return res.status(200).json(data);
    } catch (err) {
      console.error('Error fetching whitelist from Neon PostgreSQL:', err);
      return res.status(500).json({ error: 'Database error while fetching whitelist.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

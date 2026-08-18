import { put, list } from '@vercel/blob';

export const EVM_REGEX = /^0x[a-fA-F0-9]{40}$/;

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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST: Add new EVM wallet
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

      // Validate EVM Address Format
      if (!EVM_REGEX.test(wallet)) {
        return res.status(400).json({ error: 'Please enter a valid EVM address (0x followed by 40 hex characters).' });
      }

      const normalizedWallet = wallet.toLowerCase();
      const submittedAt = new Date().toISOString();
      const blobPath = `whitelist/${normalizedWallet}.json`;
      const blobToken = getBlobToken();

      if (!blobToken) {
        console.warn('BLOB_READ_WRITE_TOKEN not found in environment.');
      }

      // Check if wallet already exists in Blob store
      if (blobToken) {
        try {
          const checkList = await list({
            prefix: `whitelist/${normalizedWallet}.json`,
            token: blobToken,
            limit: 1,
          });
          if (checkList.blobs && checkList.blobs.length > 0) {
            return res.status(409).json({ error: 'This wallet was already registered for whitelist.' });
          }
        } catch (listErr) {
          console.warn('List duplicate check warning:', listErr);
        }
      }

      // Payload for JSON file
      const payload = JSON.stringify({
        wallet,
        submittedAt,
      }, null, 2);

      // Save to Vercel Blob
      if (blobToken) {
        try {
          await put(blobPath, payload, {
            access: 'private',
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: 'application/json',
            token: blobToken,
          });
        } catch (privErr: any) {
          // Fallback to public if store is public
          try {
            await put(blobPath, payload, {
              access: 'public',
              addRandomSuffix: false,
              allowOverwrite: true,
              contentType: 'application/json',
              token: blobToken,
            });
          } catch (pubErr: any) {
            throw new Error(`Blob storage failed: ${privErr.message || pubErr.message}`);
          }
        }
      }

      // Optional Postgres dual-sync
      if (process.env.DATABASE_URL) {
        try {
          const { default: postgres } = await import('postgres');
          const sql = postgres(process.env.DATABASE_URL, {
            ssl: 'require',
            max: 1,
            idle_timeout: 5,
          });
          await sql`
            CREATE TABLE IF NOT EXISTS whitelist (
              id SERIAL PRIMARY KEY,
              wallet VARCHAR(42) UNIQUE NOT NULL,
              submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          `;
          await sql`
            INSERT INTO whitelist (wallet) VALUES (${wallet})
            ON CONFLICT (wallet) DO NOTHING;
          `;
          await sql.end();
        } catch (pgErr) {
          console.warn('PostgreSQL sync skipped:', pgErr);
        }
      }

      // Get count
      let totalCount = 1;
      if (blobToken) {
        try {
          const allBlobs = await list({
            prefix: 'whitelist/',
            token: blobToken,
          });
          totalCount = allBlobs.blobs?.length || 1;
        } catch (cntErr) {
          // ignore count error
        }
      }

      return res.status(201).json({
        ok: true,
        submittedAt,
        total: totalCount,
      });
    } catch (err: any) {
      console.error('API Error in /api/whitelist:', err);
      return res.status(500).json({ error: err.message || 'Server error while saving wallet.' });
    }
  }

  // GET: Fetch all whitelisted wallets
  if (req.method === 'GET') {
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
          url: b.url,
        };
      });

      wallets.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      return res.status(200).json({
        count: wallets.length,
        wallets,
      });
    } catch (err: any) {
      console.error('Error fetching whitelist:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch whitelist' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

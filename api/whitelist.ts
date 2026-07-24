import fs from 'fs';
import path from 'path';
import { put, list } from '@vercel/blob';

const DATA_FILE = path.join('/tmp', 'wallets_database.json');

interface WalletRecord {
  wallet: string;
  submittedAt: string;
}

function loadWallets(): WalletRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading local wallets:', err);
  }
  return [];
}

function saveWallets(wallets: WalletRecord[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(wallets, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local wallets:', err);
  }
}

const evmAddress = /^0x[a-fA-F0-9]{40}$/;

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    const wallet = typeof body?.wallet === 'string' ? body.wallet.trim() : '';

    if (!evmAddress.test(wallet)) {
      return res.status(400).json({ error: 'Enter a valid EVM address (0x followed by 40 hex characters).' });
    }

    const wallets = loadWallets();
    const normalized = wallet.toLowerCase();
    if (wallets.some(r => r.wallet.toLowerCase() === normalized)) {
      return res.status(409).json({ error: 'This wallet was already submitted.' });
    }

    const record: WalletRecord = { wallet, submittedAt: new Date().toISOString() };
    wallets.push(record);
    saveWallets(wallets);

    // Save to Vercel Blob Storage under 'whitelist/<wallet>.json'
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        await put(`whitelist/${normalized}.json`, JSON.stringify(record, null, 2), {
          access: 'public',
          addRandomSuffix: false,
          contentType: 'application/json',
        });
      }
    } catch (blobErr) {
      console.error('Vercel Blob Upload Error:', blobErr);
    }

    return res.status(201).json({ ok: true, submittedAt: record.submittedAt, total: wallets.length });
  }

  if (req.method === 'GET') {
    let wallets = loadWallets();

    // Optionally load from Vercel Blob if available
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { blobs } = await list({ prefix: 'whitelist/' });
        if (blobs && blobs.length > 0) {
          const blobWallets = blobs.map(b => {
            const rawName = b.pathname.replace(/^whitelist\//, '').replace(/\.json$/, '');
            return {
              wallet: rawName,
              submittedAt: b.uploadedAt ? b.uploadedAt.toISOString() : new Date().toISOString()
            };
          });
          
          // Merge with local wallets without duplicates
          const seen = new Set(wallets.map(w => w.wallet.toLowerCase()));
          for (const bw of blobWallets) {
            if (!seen.has(bw.wallet.toLowerCase())) {
              seen.add(bw.wallet.toLowerCase());
              wallets.push(bw);
            }
          }
        }
      }
    } catch (blobErr) {
      console.error('Vercel Blob List Error:', blobErr);
    }

    return res.status(200).json({ count: wallets.length, wallets });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


import fs from 'fs';
import path from 'path';

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
    console.error('Error reading wallets:', err);
  }
  return [];
}

function saveWallets(wallets: WalletRecord[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(wallets, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving wallets:', err);
  }
}

const evmAddress = /^0x[a-fA-F0-9]{40}$/;

export default function handler(req: any, res: any) {
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

    return res.status(201).json({ ok: true, submittedAt: record.submittedAt, total: wallets.length });
  }

  if (req.method === 'GET') {
    const wallets = loadWallets();
    return res.status(200).json({ count: wallets.length, wallets });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

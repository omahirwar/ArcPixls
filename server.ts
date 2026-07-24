import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Safe path for both local/container & Vercel serverless environment
const DATA_FILE = (process.env.VERCEL || fs.existsSync('/tmp'))
  ? path.join('/tmp', 'wallets_database.json')
  : path.join(__dirname, 'wallets_database.json');

interface WalletRecord {
  wallet: string;
  submittedAt: string;
}

// Load persisted wallets from disk
function loadWallets(): WalletRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading wallets_database.json:', err);
  }
  return [];
}

// Save wallets to disk
function saveWallets(wallets: WalletRecord[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(wallets, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving wallets_database.json:', err);
  }
}

let walletRecords: WalletRecord[] = loadWallets();

// EVM Address regex
const evmAddress = /^0x[a-fA-F0-9]{40}$/;

// API Endpoint for Whitelist Submission
app.post('/api/whitelist', (req, res) => {
  walletRecords = loadWallets();
  const wallet = typeof req.body?.wallet === 'string' ? req.body.wallet.trim() : '';

  if (!evmAddress.test(wallet)) {
    return res.status(400).json({ error: 'Enter a valid EVM address (0x followed by 40 hex characters).' });
  }

  const normalized = wallet.toLowerCase();
  const exists = walletRecords.some(r => r.wallet.toLowerCase() === normalized);
  if (exists) {
    return res.status(409).json({ error: 'This wallet was already submitted.' });
  }

  const record: WalletRecord = { wallet, submittedAt: new Date().toISOString() };
  walletRecords.push(record);
  saveWallets(walletRecords);

  console.log(`[Whitelist] Added wallet: ${wallet}`);
  return res.status(201).json({ ok: true, submittedAt: record.submittedAt, total: walletRecords.length });
});

// GET Endpoint to inspect whitelist
app.get('/api/whitelist', (_req, res) => {
  walletRecords = loadWallets();
  return res.json({
    count: walletRecords.length,
    wallets: walletRecords
  });
});

// GET Endpoint to download CSV file
app.get('/api/whitelist/download', (_req, res) => {
  walletRecords = loadWallets();
  let csv = 'Wallet Address,Submitted At\n';
  walletRecords.forEach(r => {
    csv += `"${r.wallet}","${r.submittedAt}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="arcpixls_whitelisted_wallets.csv"');
  return res.status(200).send(csv);
});

// Vite / static middleware setup
async function setupFrontend() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(__dirname));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
    });
  }
}

setupFrontend();

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ArcPixls server listening on http://0.0.0.0:${PORT}`);
  });
}


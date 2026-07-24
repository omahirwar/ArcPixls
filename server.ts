import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { put, list } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Path for storing wallet submissions
// /tmp is used for Vercel serverless environment
const DATA_FILE = (process.env.VERCEL || fs.existsSync('/tmp'))
  ? path.join('/tmp', 'wallets_database.json')
  : path.join(__dirname, 'wallets_database.json');

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

// Health check endpoint
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({ status: 'ok' });
});

// API Endpoint for Whitelist Submission
app.post(['/api/whitelist', '/whitelist'], async (req, res) => {
  const wallets = loadWallets();
  const wallet = typeof req.body?.wallet === 'string' ? req.body.wallet.trim() : '';

  if (!evmAddress.test(wallet)) {
    return res.status(400).json({ error: 'Enter a valid EVM address (0x followed by 40 hex characters).' });
  }

  const normalized = wallet.toLowerCase();
  const exists = wallets.some(r => r.wallet.toLowerCase() === normalized);
  if (exists) {
    return res.status(409).json({ error: 'This wallet was already submitted.' });
  }

  const record: WalletRecord = { wallet, submittedAt: new Date().toISOString() };
  wallets.push(record);
  saveWallets(wallets);

  // Save to Vercel Blob Storage under 'whitelist/<wallet>.json'
  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      await put(`whitelist/${normalized}.json`, JSON.stringify(record, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
        token: blobToken,
      });
    }
  } catch (blobErr) {
    console.error('Vercel Blob Upload Error:', blobErr);
  }

  return res.status(201).json({ ok: true, submittedAt: record.submittedAt, total: wallets.length });
});

// GET Endpoint to inspect whitelist
app.get(['/api/whitelist', '/whitelist'], async (_req, res) => {
  const wallets = loadWallets();

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      const { blobs } = await list({ prefix: 'whitelist/', token: blobToken });
      if (blobs && blobs.length > 0) {
        const seen = new Set(wallets.map(w => w.wallet.toLowerCase()));
        for (const b of blobs) {
          const rawWallet = b.pathname.replace(/^whitelist\//, '').replace(/\.json$/, '');
          if (!seen.has(rawWallet.toLowerCase())) {
            seen.add(rawWallet.toLowerCase());
            wallets.push({
              wallet: rawWallet,
              submittedAt: b.uploadedAt ? b.uploadedAt.toISOString() : new Date().toISOString()
            });
          }
        }
      }
    }
  } catch (blobErr) {
    console.error('Vercel Blob List Error:', blobErr);
  }

  return res.json({
    count: wallets.length,
    wallets: wallets
  });
});

// GET Endpoint to download CSV file
app.get(['/api/whitelist/download', '/whitelist/download'], async (_req, res) => {
  const wallets = loadWallets();

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (blobToken) {
      const { blobs } = await list({ prefix: 'whitelist/', token: blobToken });
      if (blobs && blobs.length > 0) {
        const seen = new Set(wallets.map(w => w.wallet.toLowerCase()));
        for (const b of blobs) {
          const rawWallet = b.pathname.replace(/^whitelist\//, '').replace(/\.json$/, '');
          if (!seen.has(rawWallet.toLowerCase())) {
            seen.add(rawWallet.toLowerCase());
            wallets.push({
              wallet: rawWallet,
              submittedAt: b.uploadedAt ? b.uploadedAt.toISOString() : new Date().toISOString()
            });
          }
        }
      }
    }
  } catch (blobErr) {
    console.error('Vercel Blob List Error:', blobErr);
  }

  let csv = 'Wallet Address,Submitted At\n';
  wallets.forEach(r => {
    csv += `"${r.wallet}","${r.submittedAt}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="arcpixls_whitelisted_wallets.csv"');
  return res.status(200).send(csv);
});

// Serve static files (handles both local dev and Vercel serverless execution)
const rootDir = fs.existsSync(path.join(process.cwd(), 'index.html')) ? process.cwd() : __dirname;
app.use(express.static(rootDir));

// Fallback to index.html
app.get('*', (_req, res) => {
  const indexPath = path.join(rootDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ArcPixls server listening on http://0.0.0.0:${PORT}`);
  });
}



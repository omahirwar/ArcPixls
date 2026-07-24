import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { insertWallet, getWhitelistedWallets, EVM_REGEX } from './lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global CORS Middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Health check endpoint
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({ status: 'ok' });
});

// POST Endpoint for Whitelist Submission (Neon PostgreSQL)
app.post(['/api/whitelist', '/whitelist'], async (req, res) => {
  try {
    const wallet = typeof req.body?.wallet === 'string' ? req.body.wallet.trim() : '';

    if (!EVM_REGEX.test(wallet)) {
      return res.status(400).json({ error: 'Enter a valid EVM address (0x followed by 40 hex characters).' });
    }

    // Insert wallet into Neon PostgreSQL
    const record = await insertWallet(wallet);

    // Fetch total count after insertion
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
    console.error('Error in POST /api/whitelist:', err);
    return res.status(500).json({ error: 'Database error while registering wallet.' });
  }
});

// GET Endpoint to inspect whitelist (Neon PostgreSQL)
app.get(['/api/whitelist', '/whitelist'], async (_req, res) => {
  try {
    const data = await getWhitelistedWallets();
    return res.json(data);
  } catch (err) {
    console.error('Error in GET /api/whitelist:', err);
    return res.status(500).json({ error: 'Database error while fetching whitelist.' });
  }
});

// GET Admin Whitelist Endpoint
app.get(['/api/admin/whitelist', '/admin/whitelist'], async (_req, res) => {
  try {
    const data = await getWhitelistedWallets();
    return res.json({
      count: data.count,
      wallets: data.wallets.map(w => ({
        wallet: w.wallet,
        submittedAt: w.submittedAt
      }))
    });
  } catch (err) {
    console.error('Error in GET /api/admin/whitelist:', err);
    return res.status(500).json({ error: 'Database error while fetching admin whitelist.' });
  }
});

// GET Endpoint to download CSV file (Neon PostgreSQL)
app.get(['/api/whitelist/download', '/whitelist/download'], async (_req, res) => {
  try {
    const { wallets } = await getWhitelistedWallets();

    let csv = 'Wallet Address,Submitted At\n';
    wallets.forEach(r => {
      csv += `"${r.wallet}","${r.submittedAt}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="arcpixls_whitelisted_wallets.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    console.error('Error generating CSV download:', err);
    return res.status(500).json({ error: 'Database error while generating CSV download.' });
  }
});

// Serve static files
const rootDir = fs.existsSync(path.join(process.cwd(), 'index.html')) ? process.cwd() : __dirname;
app.use(express.static(rootDir));

// SPA Fallback
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

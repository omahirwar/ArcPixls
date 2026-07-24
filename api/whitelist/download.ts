import fs from 'fs';
import path from 'path';
import { list } from '@vercel/blob';

const DATA_FILE = path.join('/tmp', 'wallets_database.json');

export default async function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (_req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let wallets: any[] = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      wallets = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading wallets for download:', err);
  }

  // Load from Vercel Blob if available
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
    console.error('Vercel Blob Download Error:', blobErr);
  }

  let csv = 'Wallet Address,Submitted At\n';
  wallets.forEach((r: any) => {
    csv += `"${r.wallet}","${r.submittedAt}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="arcpixls_whitelisted_wallets.csv"');
  return res.status(200).send(csv);
}

import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join('/tmp', 'wallets_database.json');

export default function handler(_req: any, res: any) {
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

  let csv = 'Wallet Address,Submitted At\n';
  wallets.forEach((r: any) => {
    csv += `"${r.wallet}","${r.submittedAt}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="arcpixls_whitelisted_wallets.csv"');
  return res.status(200).send(csv);
}

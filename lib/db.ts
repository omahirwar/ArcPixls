import { put, list } from '@vercel/blob';

/**
 * Interface representing a whitelisted wallet record.
 */
export interface WalletRecord {
  id?: number;
  wallet: string;
  submittedAt: string;
  url?: string;
}

// In-memory fallback for local dev / preview when tokens are not set
const memoryStore = new Map<string, { wallet: string; submittedAt: string }>();

// Global Postgres client (optional secondary persistence)
let sqlClient: any = null;
let sqlInitPromise: Promise<void> | null = null;

/**
 * EVM Wallet Address Regular Expression (0x followed by 40 hex characters)
 */
export const EVM_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Robust helper to retrieve active Blob token from environment variables.
 * Checks BLOB_READ_WRITE_TOKEN, store-specific tokens (e.g. ONCHAINSAPE_BLOB_READ_WRITE_TOKEN),
 * and any other valid Vercel Blob token.
 */
function getBlobToken(): string | undefined {
  // 1. Direct standard names
  if (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN.trim() !== '') {
    return process.env.BLOB_READ_WRITE_TOKEN.trim();
  }
  if (process.env.VERCEL_BLOB_READ_WRITE_TOKEN && process.env.VERCEL_BLOB_READ_WRITE_TOKEN.trim() !== '') {
    return process.env.VERCEL_BLOB_READ_WRITE_TOKEN.trim();
  }

  // 2. Search for any store-specific token created by Vercel
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

/**
 * Helper to get optional PostgreSQL client if DATABASE_URL is configured
 */
async function getPostgresClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!sqlClient) {
    try {
      const { default: postgres } = await import('postgres');
      sqlClient = postgres(connectionString, {
        ssl: connectionString.includes('localhost') ? false : 'require',
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
    } catch (e) {
      console.warn('PostgreSQL client load failed:', e);
      return null;
    }
  }
  return sqlClient;
}

async function initPostgres() {
  const sql = await getPostgresClient();
  if (!sql) return;
  if (sqlInitPromise) return sqlInitPromise;

  sqlInitPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS whitelist (
          id SERIAL PRIMARY KEY,
          wallet VARCHAR(42) UNIQUE NOT NULL,
          submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_whitelist_wallet_lower ON whitelist (LOWER(wallet));
      `;
    } catch (e) {
      console.warn('PostgreSQL table init skipped:', e);
    }
  })();
  return sqlInitPromise;
}

/**
 * Inserts a new EVM wallet address into Vercel Blob Storage and/or Postgres.
 * Checks for duplicates (case-insensitive) and validates format.
 */
export async function insertWallet(wallet: string): Promise<WalletRecord> {
  const trimmed = wallet.trim();

  // Validate EVM format
  if (!EVM_REGEX.test(trimmed)) {
    throw new Error('INVALID_ADDRESS');
  }

  const normalizedWallet = trimmed.toLowerCase();
  const submittedAt = new Date().toISOString();
  const blobPath = `whitelist/${normalizedWallet}.json`;
  const blobToken = getBlobToken();

  // 1. If Vercel Blob token is configured, save directly to Vercel Blob (Private or Public store)
  if (blobToken) {
    try {
      // Check for duplicate in Blob Store via list
      try {
        const checkList = await list({
          prefix: `whitelist/${normalizedWallet}.json`,
          token: blobToken,
          limit: 1,
        });
        if (checkList.blobs && checkList.blobs.length > 0) {
          throw new Error('DUPLICATE_WALLET');
        }
      } catch (checkErr: any) {
        if (checkErr.message === 'DUPLICATE_WALLET') {
          throw checkErr;
        }
      }

      // JSON payload formatted for Vercel Blob
      const payload = JSON.stringify({
        wallet: trimmed,
        submittedAt,
      }, null, 2);

      let blobResult;
      // Try 'private' access first (matches user's private onchainsape-blob store)
      try {
        blobResult = await put(blobPath, payload, {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json',
          token: blobToken,
        });
      } catch (privErr: any) {
        // If private access fails, fallback to 'public' access
        try {
          blobResult = await put(blobPath, payload, {
            access: 'public',
            addRandomSuffix: false,
            allowOverwrite: true,
            contentType: 'application/json',
            token: blobToken,
          });
        } catch (pubErr: any) {
          throw new Error(`Vercel Blob save failed: ${privErr.message || pubErr.message}`);
        }
      }

      console.log(`[Vercel Blob] Successfully saved wallet ${trimmed} to: ${blobResult.pathname || blobPath}`);
    } catch (err: any) {
      if (err.message === 'DUPLICATE_WALLET') {
        throw err;
      }
      console.error('[Vercel Blob Save Error]:', err);
      throw err;
    }
  } else {
    console.warn('[Vercel Blob] No BLOB_READ_WRITE_TOKEN found in environment.');
  }

  // 2. Dual-save to Neon Postgres if configured
  try {
    const sql = await getPostgresClient();
    if (sql) {
      await initPostgres();
      const existing = await sql`
        SELECT wallet FROM whitelist WHERE LOWER(wallet) = LOWER(${trimmed}) LIMIT 1
      `;
      if (existing.length > 0) {
        throw new Error('DUPLICATE_WALLET');
      }
      await sql`
        INSERT INTO whitelist (wallet)
        VALUES (${trimmed})
      `;
    }
  } catch (err: any) {
    if (err.message === 'DUPLICATE_WALLET' || err.code === '23505') {
      throw new Error('DUPLICATE_WALLET');
    }
    console.warn('[PostgreSQL Sync Warning]:', err.message);
  }

  // 3. Fallback / Memory Store sync
  if (memoryStore.has(normalizedWallet)) {
    throw new Error('DUPLICATE_WALLET');
  }
  memoryStore.set(normalizedWallet, { wallet: trimmed, submittedAt });

  return {
    wallet: trimmed,
    submittedAt,
  };
}

/**
 * Retrieves all whitelisted wallets from Vercel Blob, PostgreSQL, or in-memory store.
 */
export async function getWhitelistedWallets(): Promise<{ count: number; wallets: WalletRecord[] }> {
  const blobToken = getBlobToken();

  // 1. Fetch from Vercel Blob if configured
  if (blobToken) {
    try {
      const response = await list({
        prefix: 'whitelist/',
        token: blobToken,
      });

      if (response.blobs && response.blobs.length > 0) {
        const wallets: WalletRecord[] = response.blobs.map((b) => {
          const cleanName = b.pathname.replace(/^whitelist\//, '').replace(/\.json$/, '');
          return {
            wallet: cleanName,
            submittedAt: b.uploadedAt ? new Date(b.uploadedAt).toISOString() : new Date().toISOString(),
            url: b.url,
          };
        });

        // Sort descending by submission date
        wallets.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

        return {
          count: wallets.length,
          wallets,
        };
      }
    } catch (err) {
      console.error('[Vercel Blob List Error]:', err);
    }
  }

  // 2. Fetch from PostgreSQL if available
  try {
    const sql = await getPostgresClient();
    if (sql) {
      await initPostgres();
      const rows = await sql`
        SELECT wallet, submitted_at
        FROM whitelist
        ORDER BY submitted_at DESC
      `;
      const wallets: WalletRecord[] = rows.map((r: any) => ({
        wallet: r.wallet,
        submittedAt: new Date(r.submitted_at).toISOString(),
      }));
      return {
        count: wallets.length,
        wallets,
      };
    }
  } catch (err) {
    console.error('[Postgres Query Error]:', err);
  }

  // 3. Fallback to Memory Store
  const wallets: WalletRecord[] = Array.from(memoryStore.values())
    .map((item) => ({
      wallet: item.wallet,
      submittedAt: item.submittedAt,
    }))
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return {
    count: wallets.length,
    wallets,
  };
}

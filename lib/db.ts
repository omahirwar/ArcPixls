import { put, list, head } from '@vercel/blob';
import postgres from 'postgres';

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
let sqlClient: ReturnType<typeof postgres> | null = null;
let sqlInitPromise: Promise<void> | null = null;

/**
 * EVM Wallet Address Regular Expression (0x followed by 40 hex characters)
 */
export const EVM_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Helper to get active Blob token from environment
 */
function getBlobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
}

/**
 * Helper to get optional PostgreSQL client if DATABASE_URL is configured
 */
function getPostgresClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!sqlClient) {
    sqlClient = postgres(connectionString, {
      ssl: connectionString.includes('localhost') ? false : 'require',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sqlClient;
}

async function initPostgres() {
  const sql = getPostgresClient();
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

  let savedToBlob = false;
  let blobError: Error | null = null;

  // 1. If Vercel Blob token is configured, save directly to Vercel Blob (Private or Public store)
  if (blobToken) {
    try {
      // Check for duplicate in Blob Store
      try {
        const existingBlob = await head(blobPath, { token: blobToken });
        if (existingBlob) {
          throw new Error('DUPLICATE_WALLET');
        }
      } catch (checkErr: any) {
        if (checkErr.message === 'DUPLICATE_WALLET') {
          throw checkErr;
        }
        // 404 / NotFoundError is expected when blob doesn't exist yet
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
          contentType: 'application/json',
          token: blobToken,
        });
      } catch (privErr: any) {
        // If private access fails, fallback to 'public' access
        try {
          blobResult = await put(blobPath, payload, {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'application/json',
            token: blobToken,
          });
        } catch (pubErr: any) {
          throw new Error(`Vercel Blob put failed: ${privErr.message || pubErr.message}`);
        }
      }

      savedToBlob = true;
      console.log(`[Vercel Blob] Saved wallet ${trimmed} to: ${blobResult.pathname || blobPath}`);
    } catch (err: any) {
      if (err.message === 'DUPLICATE_WALLET') {
        throw err;
      }
      console.error('[Vercel Blob Save Error]:', err);
      blobError = err;
    }
  } else {
    console.warn('[Vercel Blob] BLOB_READ_WRITE_TOKEN is not set in environment variables.');
  }

  // 2. Dual-save to Neon Postgres if configured
  const sql = getPostgresClient();
  if (sql) {
    try {
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
    } catch (err: any) {
      if (err.message === 'DUPLICATE_WALLET' || err.code === '23505') {
        throw new Error('DUPLICATE_WALLET');
      }
      console.warn('[PostgreSQL Sync Warning]:', err.message);
    }
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
          // Extract wallet from pathname: whitelist/0x123...json
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
  const sql = getPostgresClient();
  if (sql) {
    try {
      await initPostgres();
      const rows = await sql`
        SELECT wallet, submitted_at
        FROM whitelist
        ORDER BY submitted_at DESC
      `;
      const wallets: WalletRecord[] = rows.map((r) => ({
        wallet: r.wallet,
        submittedAt: new Date(r.submitted_at).toISOString(),
      }));
      return {
        count: wallets.length,
        wallets,
      };
    } catch (err) {
      console.error('[Postgres Query Error]:', err);
    }
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

import postgres from 'postgres';

/**
 * Interface representing a whitelisted wallet record in PostgreSQL.
 */
export interface WalletRecord {
  id?: number;
  wallet: string;
  submittedAt: string;
}

// Global database client instance and database initialization promise.
let sqlClient: ReturnType<typeof postgres> | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Returns a singleton PostgreSQL client instance connected via DATABASE_URL.
 * Automatically configured for Neon PostgreSQL (SSL enabled).
 */
export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing. Please configure Neon PostgreSQL in Vercel settings.');
  }

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

/**
 * Ensures the `whitelist` table and performance indexes exist in Neon PostgreSQL.
 * Executes automatically before database queries.
 */
export async function initDb() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const sql = getDb();

    // 1. Create whitelist table if it does not exist
    await sql`
      CREATE TABLE IF NOT EXISTS whitelist (
        id SERIAL PRIMARY KEY,
        wallet VARCHAR(42) UNIQUE NOT NULL,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 2. Add SQL index for case-insensitive wallet lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_whitelist_wallet_lower ON whitelist (LOWER(wallet));
    `;

    // 3. Add SQL index for sorting by submission date descending
    await sql`
      CREATE INDEX IF NOT EXISTS idx_whitelist_submitted_at ON whitelist (submitted_at DESC);
    `;
  })();

  return initPromise;
}

/**
 * EVM Wallet Address Regular Expression (0x followed by 40 hex characters)
 */
export const EVM_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * Inserts a new EVM wallet address into Neon PostgreSQL.
 * Checks for duplicates (case-insensitive) and validates format.
 */
export async function insertWallet(wallet: string): Promise<WalletRecord> {
  await initDb();
  const sql = getDb();
  const trimmed = wallet.trim();

  // Validate EVM format
  if (!EVM_REGEX.test(trimmed)) {
    throw new Error('INVALID_ADDRESS');
  }

  // Check if wallet already exists (case-insensitive check)
  const existing = await sql`
    SELECT wallet FROM whitelist WHERE LOWER(wallet) = LOWER(${trimmed}) LIMIT 1
  `;

  if (existing.length > 0) {
    throw new Error('DUPLICATE_WALLET');
  }

  // Insert wallet into Neon PostgreSQL
  const rows = await sql`
    INSERT INTO whitelist (wallet)
    VALUES (${trimmed})
    RETURNING id, wallet, submitted_at
  `;

  const record = rows[0];
  return {
    id: record.id,
    wallet: record.wallet,
    submittedAt: new Date(record.submitted_at).toISOString(),
  };
}

/**
 * Retrieves all whitelisted wallets from Neon PostgreSQL ordered by submitted_at DESC.
 */
export async function getWhitelistedWallets(): Promise<{ count: number; wallets: WalletRecord[] }> {
  await initDb();
  const sql = getDb();

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
}

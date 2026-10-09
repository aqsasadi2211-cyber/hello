import pg from "pg";

// Vercel's Neon integration sets DATABASE_URL (or POSTGRES_URL). Without one, saving is skipped.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = connectionString
  ? new pg.Pool({
      connectionString,
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
      max: 3,
    })
  : null;

let tableReady;

function ensureTable() {
  tableReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      subject    TEXT,
      message    TEXT NOT NULL,
      email_sent BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`).catch((err) => {
      tableReady = undefined;
      throw err;
    });
  return tableReady;
}

export const dbEnabled = Boolean(pool);

// Returns the new row id, or null when no database is configured.
export async function saveMessage({ name, email, subject, message }) {
  if (!pool) return null;
  await ensureTable();
  const { rows } = await pool.query(
    "INSERT INTO messages (name, email, subject, message) VALUES ($1, $2, $3, $4) RETURNING id",
    [name, email, subject || null, message]
  );
  return rows[0].id;
}

export async function markEmailSent(id) {
  if (!pool || id == null) return;
  await pool.query("UPDATE messages SET email_sent = TRUE WHERE id = $1", [id]);
}

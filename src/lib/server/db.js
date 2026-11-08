// SQLite via Node's built-in `node:sqlite` (stable in the Node 24+ line the
// project runs on): zero native dependencies, single-file database. Swapping
// to a hosted Postgres later only touches this module.
//
// All access is synchronous — the dataset is tiny (per-user JSON snapshots).
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS user_state (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state      TEXT NOT NULL CHECK (json_valid(state)),
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
`;

function dbPath() {
  const configured = process.env.MMX_DB_PATH;
  // The path is runtime-configurable on purpose (MMX_DB_PATH is documented
  // behavior), so this resolve stays dynamic. turbopackIgnore tells the
  // build-time tracer not to analyze it into the deployment graph — the
  // call itself is a plain path string for node:fs at runtime.
  const file = configured
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), configured)
    : path.join(process.cwd(), "data", "macro-maxxing.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return file;
}

// Cache the connection across route-handler invocations; dev hot reload would
// otherwise open a fresh one per module evaluation.
const globalRef = globalThis;
export function getDb() {
  if (!globalRef.__macroMaxxingDb) {
    const db = new DatabaseSync(dbPath());
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(SCHEMA);
    globalRef.__macroMaxxingDb = db;
  }
  return globalRef.__macroMaxxingDb;
}

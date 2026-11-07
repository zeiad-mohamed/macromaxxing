// User accounts (email + password). Emails are stored normalized-lowercase.
import { randomUUID } from "node:crypto";
import { getDb } from "./db.js";
import { hashPassword } from "./passwords.js";
import { MIN_PASSWORD_LENGTH } from "../shared/password.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/** Error message for invalid credentials payloads, or null when valid. */
export function registrationError({ email, password }) {
  if (normalizeEmail(email) === "" || !EMAIL_PATTERN.test(normalizeEmail(email))) {
    return "Enter a valid email address.";
  }
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function findUserByEmail(email) {
  return (
    getDb()
      .prepare("SELECT id, email, password_hash, created_at FROM users WHERE email = ?")
      .get(normalizeEmail(email)) ?? null
  );
}

export function findUserById(id) {
  const row = getDb()
    .prepare("SELECT id, email, password_hash, created_at FROM users WHERE id = ?")
    .get(id);
  if (!row) return null;
  const { id: rowId, email } = row;
  return { id: rowId, email };
}

export function createUser(email, password) {
  const db = getDb();
  const normalized = normalizeEmail(email);
  const now = Date.now();
  try {
    db.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
      randomUUID(),
      normalized,
      hashPassword(password),
      now,
    );
  } catch (error) {
    if (String(error?.message ?? "").includes("UNIQUE")) {
      return { user: null, conflict: true };
    }
    throw error;
  }
  return { user: findUserByEmail(normalized), conflict: false };
}

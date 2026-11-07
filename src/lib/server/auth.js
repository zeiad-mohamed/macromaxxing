// Session tokens: random 256-bit value in an httpOnly cookie, only the
// SHA-256 hash is stored server-side. Sessions are revocable (logout deletes
// the row). Every API handler re-validates the session — src/proxy.js is an
// optimistic redirect only.
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../shared/session.js";
import { getDb } from "./db.js";

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function userFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** Verifies the presented token and returns the user, or null. */
export function userForSessionToken(token) {
  if (typeof token !== "string" || token.length === 0) return null;
  const db = getDb();
  const row = db
    .prepare(
      "SELECT users.id, users.email, users.created_at FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > ?",
    )
    .get(hashToken(token), Date.now());
  return userFromRow(row);
}

/** Creates a session row for the user and returns the raw cookie token. */
export function createSession(userId) {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
  ).run(hashToken(token), userId, now, now + SESSION_MAX_AGE_SECONDS * 1000);
  return token;
}

/** Deletes one session; returns whether a session row existed. */
export function destroySession(token) {
  if (typeof token !== "string" || token.length === 0) return false;
  const result = getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  return result.changes > 0;
}

/** Reads the session token from an incoming API request, if any. */
export function tokenFromRequest(request) {
  return request.cookies?.get?.(SESSION_COOKIE_NAME)?.value ?? null;
}

/** Like userForSessionToken(tokenFromRequest(request)) — handler helper. */
export function userFromRequest(request) {
  return userForSessionToken(tokenFromRequest(request));
}

/** Application response with a fresh session cookie attached. */
export function sessionResponse(body, { status = 200, token = null } = {}) {
  const response = NextResponse.json(body, { status });
  if (token) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  }
  return response;
}

/** Application response that poisons the session cookie (after logout). */
export function clearSessionCookieResponse(body, { status = 200 } = {}) {
  const response = NextResponse.json(body, { status });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

/** Cleans up expired sessions. Call opportunistically (e.g. on login). */
export function pruneExpiredSessions() {
  const result = getDb().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  return result.changes;
}

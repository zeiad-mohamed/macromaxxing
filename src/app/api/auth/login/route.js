// POST /api/auth/login { email, password } → session cookie.
// Always answers "Incorrect email or password" for bad credentials so the
// endpoint does not reveal whether an email is registered.
import { NextResponse } from "next/server";
import { findUserByEmail } from "@/lib/server/users.js";
import { createSession, pruneExpiredSessions, sessionResponse } from "@/lib/server/auth.js";
import { verifyPassword } from "@/lib/server/passwords.js";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Send JSON with email and password." }, { status: 400 });
  }

  pruneExpiredSessions();

  const row = findUserByEmail(body.email);
  const ok = verifyPassword(body.password, row?.password_hash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = createSession(row.id);
  return sessionResponse({ user: { id: row.id, email: row.email } }, { token });
}

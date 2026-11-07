// POST /api/auth/register { email, password } → creates the account and a
// session. Returns 409 when the email is already registered.
import { NextResponse } from "next/server";
import { registrationError, createUser, findUserByEmail } from "@/lib/server/users.js";
import { createSession, pruneExpiredSessions, sessionResponse } from "@/lib/server/auth.js";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Send JSON with email and password." }, { status: 400 });
  }

  const emailError = registrationError(body);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  pruneExpiredSessions();

  if (findUserByEmail(body.email) !== null) {
    return sessionResponse({ error: "That email is already registered." }, { status: 409 });
  }

  const { user, conflict } = createUser(body.email, body.password);
  if (!user) {
    return sessionResponse(
      { error: conflict ? "That email is already registered." : "Could not create the account." },
      { status: conflict ? 409 : 500 },
    );
  }

  const token = createSession(user.id);
  return sessionResponse({ user: { id: user.id, email: user.email } }, { token });
}

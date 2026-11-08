// POST /api/auth/register { email, password } → creates the account and a
// session. Returns 409 when the email is already registered, 403 when the
// instance is closed (registration disabled or user cap reached).
import { NextResponse } from "next/server";
import {
  registrationError,
  createUser,
  findUserByEmail,
  userCount,
} from "@/lib/server/users.js";
import { registrationDisabled, userLimit } from "@/lib/server/config.js";
import {
  createSession,
  pruneExpiredSessions,
  sessionResponse,
} from "@/lib/server/auth.js";

export async function POST(request) {
  if (registrationDisabled()) {
    return sessionResponse(
      { error: "Registration is disabled on this instance." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json(
      { error: "Send JSON with email and password." },
      { status: 400 },
    );
  }

  const emailError = registrationError(body);
  if (emailError) {
    return NextResponse.json({ error: emailError }, { status: 400 });
  }

  pruneExpiredSessions();

  if (findUserByEmail(body.email) !== null) {
    return sessionResponse(
      { error: "That email is already registered." },
      { status: 409 },
    );
  }

  // Registration capacity cap (MMX_MAX_USERS). Kept as one synchronous run
  // together with createUser below, so concurrent registrations cannot race
  // past the count in a single server process. An already-registered email
  // gives the 409 above instead, pointing that person to sign in.
  const limit = userLimit();
  if (limit !== null && userCount() >= limit) {
    return sessionResponse(
      { error: "This instance is not accepting new users right now." },
      { status: 403 },
    );
  }

  const { user, conflict } = createUser(body.email, body.password);
  if (!user) {
    return sessionResponse(
      {
        error: conflict
          ? "That email is already registered."
          : "Could not create the account.",
      },
      { status: conflict ? 409 : 500 },
    );
  }

  const token = createSession(user.id);
  return sessionResponse(
    { user: { id: user.id, email: user.email } },
    { token },
  );
}

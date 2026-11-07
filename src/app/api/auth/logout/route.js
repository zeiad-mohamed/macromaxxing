// POST /api/auth/logout — deletes the session row and clears the cookie.
// Idempotent: answering a second logout with 200 is fine.
import { tokenFromRequest, destroySession, clearSessionCookieResponse } from "@/lib/server/auth.js";

export async function POST(request) {
  const token = tokenFromRequest(request);
  if (token) destroySession(token);
  return clearSessionCookieResponse({ ok: true });
}

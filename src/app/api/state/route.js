// GET  /api/state → { state, updatedAt } (empty defaults for new accounts)
// PUT  /api/state → validate with the SAME rules as JSON import, then store.
// Every request re-verifies the session; the proxy is only an optimistic hint.
import { NextResponse } from "next/server";
import { userFromRequest } from "@/lib/server/auth.js";
import {
  getUserState,
  putUserState,
  emptyState,
  StateValidationError,
  StateTooLargeError,
} from "@/lib/server/stateStore.js";

export async function GET(request) {
  const user = userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const saved = getUserState(user.id);
  return NextResponse.json({
    state: saved?.state ?? emptyState(),
    updatedAt: saved?.updatedAt ?? null,
  });
}

export async function PUT(request) {
  const user = userFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Send the full state document as JSON." }, { status: 400 });
  }

  try {
    const updatedAt = putUserState(user.id, body);
    return NextResponse.json({ updatedAt });
  } catch (error) {
    if (error instanceof StateValidationError) {
      return NextResponse.json({ error: error.message, errors: error.errors }, { status: 422 });
    }
    if (error instanceof StateTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    throw error;
  }
}

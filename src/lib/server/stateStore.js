// Per-user plan state storage. The stored document is the exact snapshot the
// client already validates on import (same shape, same rules) — reuse of
// src/lib/dataIO.js guarantees the server never persists invalid state.
import { getDb } from "./db.js";
import { goalDefaults } from "../validation.js";
import { validateState } from "../dataIO.js";

// defensive ceiling so one rogue client cannot bloat the file
const MAX_STATE_BYTES = 256 * 1024;

export class StateValidationError extends Error {
  constructor(errors) {
    super("The plan state is invalid.");
    this.errors = errors;
  }
}

export class StateTooLargeError extends Error {
  constructor() {
    super("Plan state exceeds the storage limit.");
  }
}

/** Returns { state, updatedAt } or null when the user has no saved state. */
export function getUserState(userId) {
  const row = getDb()
    .prepare("SELECT state, updated_at FROM user_state WHERE user_id = ?")
    .get(userId);
  if (!row) return null;
  return {
    state: JSON.parse(row.state),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Validates and stores a full state document ({ ingredients, meals, plan,
 * goals }). Throws StateValidationError with a message list on bad input.
 * Returns the ISO updated_at timestamp.
 */
export function putUserState(userId, doc) {
  let json;
  try {
    json = JSON.stringify(doc);
  } catch {
    throw new StateValidationError(["The state is not valid JSON."]);
  }
  if (json.length > MAX_STATE_BYTES) throw new StateTooLargeError();

  const result = validateState(doc);
  if (!result.ok) throw new StateValidationError(result.errors);

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO user_state (user_id, state, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET state = excluded.state, updated_at = excluded.updated_at`,
    )
    .run(userId, JSON.stringify(result.state), now);
  return new Date(now).toISOString();
}

/** A fresh empty state — the shape returned when a user has nothing stored. */
export function emptyState() {
  return {
    ingredients: [],
    meals: [],
    plan: [],
    goals: { ...goalDefaults },
  };
}

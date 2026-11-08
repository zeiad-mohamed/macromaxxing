// Instance-level settings read from environment variables. Kept free of
// database imports so server components (auth pages) can import it too.
//
// Next.js loads .env files from the project root automatically (real process
// environment values take precedence over .env files). These are deploy-time
// settings, not per-request data: route handlers re-read them on every
// request but the server process owns the values, while prerendered pages
// bake the value in during `next build`. Either way a change applies after a
// restart in dev / a rebuild + restart in production — never mid-flight.

function disableFlag(value) {
  return typeof value === "string" && ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

/**
 * When MMX_DISABLE_REGISTRATION is truth-y (1/true/yes/on, case-insensitive),
 * the instance refuses all account creation: /register shows a notice and
 * POST /api/auth/register returns 403. Anything else means registrations are
 * open. Existing accounts can always sign in.
 */
export function registrationDisabled() {
  return disableFlag(process.env.MMX_DISABLE_REGISTRATION);
}

/**
 * Maximum number of accounts this instance will register, from the
 * MMX_MAX_USERS env variable. Unset, empty, or not a non-negative integer
 * means "no limit". Accounts that already exist can always sign in — the
 * cap applies to registration only.
 */
export function userLimit() {
  const raw = process.env.MMX_MAX_USERS;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const parsed = Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

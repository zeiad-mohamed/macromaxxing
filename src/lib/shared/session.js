// Constants shared by the server (route handlers) and src/proxy.js. Keep this
// module dependency-free: the proxy must not pull in Node-only code.
export const SESSION_COOKIE_NAME = "mm_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

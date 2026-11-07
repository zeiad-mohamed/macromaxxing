// Entrypoint page (replaces Vite's main.jsx). The ./client wrapper renders
// the app client-only — the reducer state comes from localStorage/server, so
// there is nothing to prerender and no hydration mismatch to fight.
import { ClientOnly } from "./client";

export default function Page() {
  return <ClientOnly />;
}

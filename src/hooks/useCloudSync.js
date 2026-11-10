// Two-way sync between the reducer state and the account's server state:
//   sign-in      → GET /api/state, then actions.replaceAll(...)
//   every change → debounced PUT /api/state (last-write-wins)
// localStorage still persists inside useMealBuilder, so the app keeps
// working offline; the server copy is authoritative across devices.
import { useEffect, useRef, useState } from "react";
import { serializeStored, validateState } from "@/lib/dataIO.js";

const SAVE_DEBOUNCE_MS = 700;

export default function useCloudSync({ active, user, state, actions, onUnauthorized }) {
  const [syncError, setSyncError] = useState(null);
  const ref = useRef({ loadedFor: null, loaded: false, lastSynced: null, timer: null });

  // Load once per sign-in.
  useEffect(() => {
    if (!active || !user) {
      ref.current = { loadedFor: null, loaded: false, lastSynced: null, timer: null };
      return undefined;
    }
    if (ref.current.loadedFor === user.id) return undefined;

    let cancelled = false;
    ref.current.loadedFor = user.id;
    fetch("/api/state")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.state) return;
        // The server row can be a legacy flat-plan document; validateState
        // upgrades it, and the normalized copy is what "last synced" means.
        const parsed = validateState(data.state);
        if (!parsed.ok) {
          // The server can never hold invalid state, but if it somehow does:
          // keep working from the local copy and never sync that raw doc.
          ref.current.loaded = true;
          return;
        }
        ref.current.lastSynced = serializeStored(parsed.state); // Set before replaceAll's effect runs.
        actions.replaceAll(parsed.state);
        ref.current.loaded = true;
      })
      .catch(() => {
        // Offline: keep working from localStorage; the next save will push.
        if (!cancelled) ref.current.loaded = true;
      });
    return () => {
      cancelled = true;
    };
  }, [active, user, actions]);

  // Debounced save for changes after the initial load.
  useEffect(() => {
    const sync = ref.current;
    if (!active || !sync.loaded) return undefined;

    const fingerprint = serializeStateSafe(state);
    if (fingerprint === null || fingerprint === sync.lastSynced) return undefined;

    setSyncError(null);
    sync.timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/state", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: fingerprint,
        });
        if (response.status === 401) {
          sync.loaded = false;
          setSyncError("Your session ended. Sign in again to keep saving.");
          onUnauthorized?.();
          return;
        }
        if (response.ok) {
          sync.lastSynced = fingerprint;
        } else {
          setSyncError("Could not save to the cloud. Your changes stay on this device.");
        }
      } catch {
        setSyncError("Could not reach the server. Your changes stay on this device.");
      }
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(sync.timer);
  }, [state, active, onUnauthorized]);

  return { syncing: syncError === null, syncError, clearSyncError: () => setSyncError(null) };
}

// PUT body is the serialized snapshot (same validation happens server-side).
function serializeStateSafe(state) {
  try {
    return serializeStored(state);
  } catch {
    return null;
  }
}

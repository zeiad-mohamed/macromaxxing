// Signed-in state for the client app. The proxy gives an optimistic redirect;
// this hook decides what actually renders from the server's answer.
import { useCallback, useEffect, useState } from "react";

const INITIAL = { status: "loading", user: null };

export default function useServerSession() {
  const [session, setSession] = useState(INITIAL);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setSession({ status: "signedOut", user: null });
          return;
        }
        const data = await response.json().catch(() => null);
        if (!data?.user) {
          setSession({ status: "signedOut", user: null });
          return;
        }
        setSession({ status: "signedIn", user: data.user });
      })
      .catch(() => {
        if (!cancelled) setSession({ status: "signedOut", user: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Clears the session on the server and locally. Resolves when done. */
  const signOut = useCallback(async () => {
    setSession({ status: "signedOut", user: null });
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Offline: the local sign-out above is still correct.
    }
  }, []);

  return { ...session, signOut };
}

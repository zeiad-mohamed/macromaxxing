"use client";

// Per the Next.js "Migrate from Vite" guide: the SPA surface renders
// client-only via next/dynamic with ssr: false (only valid in a client
// component). Everything under src/App.jsx keeps working as before.
import dynamic from "next/dynamic";
import ClientLoading from "@/components/ui/ClientLoading.jsx";

const App = dynamic(() => import("@/App.jsx"), {
  ssr: false,
  loading: ClientLoading,
});

export function ClientOnly() {
  return <App />;
}

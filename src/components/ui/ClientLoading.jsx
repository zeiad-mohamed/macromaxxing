// Loading fallback shown while the client-only app bundle loads in.
export default function ClientLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-sm text-gray-400">
        <span aria-hidden="true">🍽️</span> Loading…
      </p>
    </div>
  );
}

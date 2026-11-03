/** Shared "nothing here yet" message. Children (e.g. an action button) render below. */
export default function EmptyState({ title, message, children }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-10 text-center">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {message && <p className="mt-1 text-sm text-gray-500">{message}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

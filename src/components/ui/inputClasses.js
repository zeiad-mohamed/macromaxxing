// Shared Tailwind class tokens so every panel looks the same.

export const FIELD_ERROR_TEXT = "mt-1 text-xs text-red-600";
export const FIELD_LABEL = "mb-1 block text-sm font-medium text-gray-700";

export function fieldClass(hasError, mode = "md") {
  const ring = hasError
    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100"
    : "border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
  if (mode === "inline") {
    return `w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm text-gray-900 outline-none transition hover:border-gray-300 ${ring}`;
  }
  if (mode === "sm") {
    return `w-full rounded-md border bg-white px-2 py-1 text-sm text-gray-900 shadow-sm outline-none transition ${ring}`;
  }
  return `w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition ${ring}`;
}

export const selectClass = fieldClass(false, "md");

export const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40";

export const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-400 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500 disabled:cursor-not-allowed disabled:opacity-40";

export const dangerButton =
  "inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400";

export const smallDangerButton =
  "inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400";

export const smallSecondaryButton =
  "inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-500";

/** Accordion toggle: counts items, chevron flips with open state. */
export const accordionButton =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";

/** Segmented control (Meal | Ingredient, tabs): active option is the accent. */
export function toggleGroupButton(active) {
  return `rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
    active ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
  }`;
}

export const card = "rounded-xl border border-gray-200 bg-white shadow-sm";

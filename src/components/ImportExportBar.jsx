import { useState } from "react";
import {
  buildExportFileName,
  describeCounts,
  parseExportFile,
  serializeExport,
} from "../lib/dataIO.js";
import { secondaryButton } from "./ui/inputClasses.js";

export default function ImportExportBar({ state, actions }) {
  const [importErrors, setImportErrors] = useState(null);

  function handleExport() {
    const blob = new Blob([serializeExport(state, new Date().toISOString())], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = buildExportFileName();
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = ""; // Allow re-selecting the same file.
    if (!file) return;

    let text;
    try {
      text = await file.text();
    } catch {
      setImportErrors([`Could not read "${file.name}".`]);
      return;
    }

    const result = parseExportFile(text);
    if (!result.ok) {
      setImportErrors(result.errors);
      return;
    }

    const currentCounts = describeCounts(state);
    const incomingCounts = describeCounts(result.state);
    const confirmed = window.confirm(
      `Import will replace ALL current data:\n` +
        `• Your data now: ${currentCounts}\n` +
        `• In the file: ${incomingCounts}\n\n` +
        `This cannot be undone. Continue?`,
    );
    if (!confirmed) return;

    actions.replaceAll(result.state);
    setImportErrors(null);
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex gap-2">
        <button type="button" className={secondaryButton} onClick={handleExport}>
          Export JSON
        </button>
        <label className="cursor-pointer">
          <span className={secondaryButton}>Import JSON</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="sr-only"
            aria-label="Import data from a JSON file"
          />
        </label>
      </div>
      {importErrors !== null && (
        <div
          role="alert"
          className="max-w-md rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:w-96"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">Import rejected — nothing was changed:</p>
            <button
              type="button"
              onClick={() => setImportErrors(null)}
              className="shrink-0 rounded px-1 font-semibold hover:bg-red-100"
              aria-label="Dismiss import errors"
            >
              ✕
            </button>
          </div>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {importErrors.slice(0, 8).map((error) => (
              <li key={error}>{error}</li>
            ))}
            {importErrors.length > 8 && <li>… and {importErrors.length - 8} more</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

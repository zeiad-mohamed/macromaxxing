import { useState } from "react";
import { parseNumber, numberTextError } from "../../lib/validation.js";
import { fieldClass, FIELD_ERROR_TEXT, FIELD_LABEL } from "./inputClasses.js";

/**
 * Shared numeric input used for every numeric field in the app.
 *
 * - While typing, values are validated live: invalid text shows an inline
 *   error and a red border, and is never committed (the last valid value
 *   stays in state). Valid values commit on every keystroke.
 * - An empty field is allowed while typing; on blur it commits as 0.
 * - On blur with other invalid text, the input reverts to the last valid value.
 *
 * `extraValidate(number)` adds field-specific rules (e.g. the macro sum).
 */
export default function NumberInput({
  id,
  label,
  ariaLabel,
  value,
  min,
  max,
  unit = "",
  onCommit,
  onErrorChange,
  extraValidate = null,
  mode = "md",
  className = "",
}) {
  const [draft, setDraft] = useState(String(value ?? 0));
  const [prevValue, setPrevValue] = useState(value);
  const [focused, setFocused] = useState(false);

  // When the committed value changes from outside, sync the draft — unless
  // the user is typing. Render-time adjustment pattern (no effect needed).
  if (!Object.is(prevValue, value)) {
    setPrevValue(value);
    if (!focused) setDraft(String(value ?? 0));
  }

  function errorFor(text) {
    let error = numberTextError(text, min, max, unit);
    if (error === null) {
      const parsed = parseNumber(text);
      if (parsed !== null && extraValidate) error = extraValidate(parsed);
    }
    return error;
  }

  const error = errorFor(draft);

  function handleChange(event) {
    const next = event.target.value;
    setDraft(next);
    const nextError = errorFor(next);
    const parsed = parseNumber(next);
    if (nextError === null && parsed !== null) onCommit(parsed);
    onErrorChange?.(nextError);
  }

  function handleBlur() {
    setFocused(false);
    const trimmed = draft.trim();
    if (trimmed === "") {
      setDraft("0");
      onCommit(0);
      onErrorChange?.(null);
    } else if (errorFor(trimmed) !== null) {
      // Invalid text: revert to the last valid value.
      setDraft(String(value ?? 0));
      onErrorChange?.(null);
    } else {
      // Valid again: normalize the display (e.g. "12." -> "12").
      setDraft(String(value ?? 0));
      onErrorChange?.(null);
    }
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={FIELD_LABEL}>
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={handleChange}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={handleBlur}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error !== null || undefined}
          aria-describedby={error !== null ? `${id}-error` : undefined}
          className={`${fieldClass(error !== null, mode)} ${
            unit ? (unit.length > 4 ? "pr-16" : "pr-9") : ""
          }`}
        />
        {unit && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-gray-400"
          >
            {unit}
          </span>
        )}
      </div>
      {error !== null && (
        <p id={`${id}-error`} className={FIELD_ERROR_TEXT}>
          {error}
        </p>
      )}
    </div>
  );
}

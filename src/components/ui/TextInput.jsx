import { useState } from "react";
import { fieldClass, FIELD_ERROR_TEXT, FIELD_LABEL } from "./inputClasses.js";

/**
 * Shared text input for name fields.
 *
 * `validate(trimmedText)` returns an error message string or null. Valid
 * values commit on every keystroke; invalid values are never committed, so
 * the last valid value stays in state.
 *
 * Blur behavior:
 * - invalid text → input reverts to the last valid value (reporting valid).
 * - empty text → error stays visible ("required"); nothing is committed.
 *
 * `onErrorChange(message | null)` reports validity so forms can disable
 * their submit buttons while invalid.
 */
export default function TextInput({
  id,
  label,
  ariaLabel,
  value,
  validate,
  onCommit,
  onErrorChange,
  placeholder,
  mode = "md",
  className = "",
}) {
  const [draft, setDraft] = useState(typeof value === "string" ? value : "");
  const [touched, setTouched] = useState(false);
  const [prevValue, setPrevValue] = useState(value);
  const [focused, setFocused] = useState(false);

  // When the committed value changes from outside (reset, refresh), sync the
  // draft — unless the user is typing. This is the render-time adjustment
  // pattern from the React docs (no effect needed).
  if (!Object.is(prevValue, value)) {
    setPrevValue(value);
    if (!focused) setDraft(typeof value === "string" ? value : "");
  }

  const error = validate ? validate(draft) : null;
  // An untouched, empty field stays quiet (fresh forms), the rest show errors.
  const showError = error !== null && (touched || draft.trim() !== "");

  function handleChange(event) {
    setTouched(true);
    const next = event.target.value;
    setDraft(next);
    const trimmed = next.trim();
    const nextError = validate ? validate(trimmed) : null;
    if (nextError === null && trimmed !== "") onCommit(trimmed);
    onErrorChange?.(nextError);
  }

  function handleBlur() {
    setFocused(false);
    setTouched(true);
    const trimmed = draft.trim();
    const nextError = validate ? validate(trimmed) : null;
    if (nextError !== null && trimmed !== "") {
      // Invalid text: revert to the last valid value.
      setDraft(typeof value === "string" ? value : "");
      onErrorChange?.(null);
    } else {
      if (trimmed !== "") {
        // Valid again: normalize the display (drop stray whitespace).
        setDraft(typeof value === "string" ? value : "");
      }
      onErrorChange?.(nextError);
    }
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className={FIELD_LABEL}>
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={handleChange}
        onFocus={() => {
          setFocused(true);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label={label ? undefined : ariaLabel}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? `${id}-error` : undefined}
        className={fieldClass(showError, mode)}
      />
      {showError && (
        <p id={`${id}-error`} className={FIELD_ERROR_TEXT}>
          {error}
        </p>
      )}
    </div>
  );
}

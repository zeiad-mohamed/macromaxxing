// Pure validators and defaults only. No imports.

export const NAME_MAX_LENGTH = 60;

export const CALORIES_MIN = 0;
export const CALORIES_MAX = 900;

export const MACRO_MIN = 0;
export const MACRO_MAX = 100;

export const GRAMS_MIN = 0;
export const GRAMS_MAX = 10000;

export const SERVINGS_MIN = 0;
export const SERVINGS_MAX = 100;

// Sum comparison tolerance for floating point noise (e.g. 0.1 + 0.2).
const SUM_EPSILON = 1e-9;

/**
 * Parses raw text into a finite number, or null when it is not a number.
 * An empty/whitespace-only string also yields null (handled by callers).
 */
export function parseNumber(text) {
  if (typeof text !== "string" || text.trim() === "") return null;
  const parsed = Number(text.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Validates user-typed text for a number in [min, max].
 * Empty text is allowed while typing (callers commit 0 on blur).
 * Returns an error message string, or null when valid.
 */
export function numberTextError(text, min, max, unit = "") {
  if (typeof text !== "string" || text.trim() === "") return null;
  const parsed = parseNumber(text);
  if (parsed === null) return "Enter a number.";
  return numberValueError(parsed, min, max, unit);
}

/**
 * For field values. Fields that violate the sum rule show the sum error.
 */
export function macroSumError(protein, carbs, fat) {
  const sum = numberSum(protein, carbs, fat);
  if (sum === null) return null; // Individual field errors cover this.
  if (sum > MACRO_MAX + SUM_EPSILON) {
    return "Protein, carbs and fat must add up to 100g or less per 100g.";
  }
  return null;
}

function numberValueError(value, min, max, unit = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Must be a number.";
  if (value < min || value > max) {
    return `Must be between ${min} and ${max}${unit ? ` ${unit}` : ""}.`;
  }
  return null;
}

function numberSum(...values) {
  const total = values.reduce((sum, value) => {
    if (sum === null) return null;
    return typeof value === "number" && Number.isFinite(value) ? sum + value : null;
  }, 0);
  return total === null ? null : total;
}

/**
 * Validates ingredient and meal names.
 * `otherNames` is the list of valid names the name must not collide with.
 */
export function nameError(name, otherNames = []) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed === "") return "Name is required.";
  if (trimmed.length > NAME_MAX_LENGTH) {
    return `Name must be ${NAME_MAX_LENGTH} characters or fewer.`;
  }
  const taken = otherNames.some(
    (other) =>
      typeof other === "string" && other.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  if (taken) return "That name is already taken.";
  return null;
}

// Per-field numeric validators. Accept a number or numeric string (JSON files
// may contain numeric strings), and return an error message string or null.

export function caloriesPer100gError(value) {
  return numberValueErrorOrText(value, CALORIES_MIN, CALORIES_MAX, "kcal");
}

export function macroPer100gError(value) {
  return numberValueErrorOrText(value, MACRO_MIN, MACRO_MAX, "g");
}

export function gramsError(value) {
  return numberValueErrorOrText(value, GRAMS_MIN, GRAMS_MAX, "g");
}

export function servingsError(value) {
  return numberValueErrorOrText(value, SERVINGS_MIN, SERVINGS_MAX, "servings");
}

function numberValueErrorOrText(value, min, max, unit) {
  if (typeof value === "string") {
    const err = numberTextError(value, min, max, unit);
    if (err !== null) return err; // Non-numeric or out of range.
    return null; // Valid numeric string: the parsed value equals it.
  }
  return numberValueError(value, min, max, unit);
}

// Defaults for new records (shared by forms, the reducer and the importer).
// The name default lives apart from the numeric defaults so a payload built
// as `{ name, ...numbers }` can never be shadowed back to "".

export const newIngredientNameDefault = "";

export const newIngredientDefaults = {
  caloriesPer100g: 0,
  proteinPer100g: 0,
  carbsPer100g: 0,
  fatPer100g: 0,
};

export const newMealItemDefaults = { grams: 0 };

export const newPlanMealDefaults = { servings: 1 };
export const newPlanIngredientDefaults = { grams: 0 };
export const newPlanEntryDefaults = { enabled: true };

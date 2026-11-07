// Pure serialize/parse/validate for export files and localStorage. No React,
// no browser APIs. Imports validation.js only.

import {
  nameError,
  caloriesPer100gError,
  macroPer100gError,
  macroSumError,
  gramsError,
  servingsError,
  goalCaloriesError,
  goalMacroError,
  goalDefaults,
} from "./validation.js";

export const APP_KEY = "macromaxxing";
export const STORAGE_VERSION = 1;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** "2 ingredients, 1 meal, 3 plan entries" — used in confirm dialogs. */
export function describeCounts(stateLike) {
  const count = (n, singular, plural) =>
    `${n} ${n === 1 ? singular : plural ?? `${singular}s`}`;
  const ingredients = Array.isArray(stateLike?.ingredients) ? stateLike.ingredients.length : 0;
  const meals = Array.isArray(stateLike?.meals) ? stateLike.meals.length : 0;
  const plan = Array.isArray(stateLike?.plan) ? stateLike.plan.length : 0;
  return `${count(ingredients, "ingredient")}, ${count(meals, "meal")}, ${count(plan, "plan entry", "plan entries")}`;
}

/** Stored state: single key `macromaxxing:v1` with a version field. */
export function serializeStored(state) {
  return JSON.stringify({
    version: STORAGE_VERSION,
    ingredients: state.ingredients,
    meals: state.meals,
    plan: state.plan,
    goals: state.goals,
  });
}

/** Export payload: app, version, exportedAt, then the collections. */
export function serializeExport(state, exportedAtISO) {
  return JSON.stringify({
    app: APP_KEY,
    version: STORAGE_VERSION,
    exportedAt: exportedAtISO,
    ingredients: state.ingredients,
    meals: state.meals,
    plan: state.plan,
    goals: state.goals,
  });
}

/** macromaxxing-YYYY-MM-DD.json */
export function buildExportFileName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${APP_KEY}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/**
 * Parses and fully validates an import file. Returns
 * { ok: true, state } or { ok: false, errors }. Never partially imports.
 */
export function parseExportFile(text) {
  const doc = parseEnvelope(text, { requireApp: true });
  if (!doc.ok) return doc;
  return validateState(doc.value);
}

/** Same, for the localStorage snapshot (app field not required). */
export function parseStoredState(text) {
  const doc = parseEnvelope(text, { requireApp: false });
  if (!doc.ok) return doc;
  return validateState(doc.value);
}

function fail(errors) {
  return { ok: false, errors };
}

function parseEnvelope(text, { requireApp }) {
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return fail(["The file is not valid JSON."]);
  }
  if (!isPlainObject(doc)) return fail(["Expected a JSON object at the top level."]);

  if (requireApp && doc.app !== APP_KEY) {
    return fail([`Wrong file: "app" must be "${APP_KEY}" to import it here.`]);
  }
  if (doc.version !== STORAGE_VERSION) {
    return fail([`Unsupported version: ${stringify(doc.version)}. This app supports version ${STORAGE_VERSION}.`]);
  }
  return { ok: true, value: doc };
}

function stringify(value) {
  return typeof value === "string" ? `"${value}"` : String(value);
}

/**
 * Validates and copies a { ingredients, meals, plan } document.
 * Collects every problem (paths like "plan[1]: unknown ingredientId") and
 * rejects the whole file if anything is wrong.
 */
function validateState(doc) {
  const errors = [];
  for (const key of ["ingredients", "meals", "plan"]) {
    if (!Array.isArray(doc[key])) errors.push(`${key}: must be an array.`);
  }
  if (errors.length > 0) return fail(errors);

  const ingredients = validateIngredients(doc.ingredients, errors);
  const ingredientIds = new Set(ingredients.map((i) => i.id));
  const meals = validateMeals(doc.meals, ingredientIds, errors);
  const mealIds = new Set(meals.map((m) => m.id));
  const plan = validatePlan(doc.plan, mealIds, ingredientIds, errors);
  const goals = validateGoals(doc, errors);

  if (errors.length > 0) return fail(errors);
  return { ok: true, state: { ingredients, meals, plan, goals } };
}

/**
 * Daily goals. Missing key entirely = older file, so defaults are used
 * (0 = "not set"). A present but invalid goal rejects the whole file.
 */
function validateGoals(doc, errors) {
  const raw = doc.goals;
  if (raw === undefined || raw === null) return { ...goalDefaults };
  if (!isPlainObject(raw)) {
    errors.push("goals: must be an object.");
    return { ...goalDefaults };
  }
  const calories = field(raw.calories ?? goalDefaults.calories, goalCaloriesError, "goals.calories", errors);
  const protein = field(raw.protein ?? goalDefaults.protein, goalMacroError, "goals.protein", errors);
  const carbs = field(raw.carbs ?? goalDefaults.carbs, goalMacroError, "goals.carbs", errors);
  const fat = field(raw.fat ?? goalDefaults.fat, goalMacroError, "goals.fat", errors);
  return { calories, protein, carbs, fat };
}

function validateIngredients(list, errors) {
  const ids = new Set();
  const names = [];
  const out = [];
  list.forEach((raw, index) => {
    const at = `ingredients[${index}]`;
    if (!isPlainObject(raw)) {
      errors.push(`${at}: must be an object.`);
      return;
    }
    const id = stringId(raw.id);
    if (id === null) {
      errors.push(`${at}: id must be a non-empty string.`);
      return;
    }
    if (ids.has(id)) {
      errors.push(`${at}: duplicate id.`);
      return;
    }
    const nameErr = nameError(raw.name, names);
    if (nameErr) {
      errors.push(`${at}: ${nameErr}`);
      return;
    }
    const calories = field(raw.caloriesPer100g, caloriesPer100gError, `${at}: caloriesPer100g`, errors);
    const protein = field(raw.proteinPer100g, macroPer100gError, `${at}: proteinPer100g`, errors);
    const carbs = field(raw.carbsPer100g, macroPer100gError, `${at}: carbsPer100g`, errors);
    const fat = field(raw.fatPer100g, macroPer100gError, `${at}: fatPer100g`, errors);
    if (protein !== null && carbs !== null && fat !== null) {
      const sumErr = macroSumError(protein, carbs, fat);
      if (sumErr) errors.push(`${at}: ${sumErr}`);
    }
    if ([calories, protein, carbs, fat].some((v) => v === null)) return;

    ids.add(id);
    names.push(String(raw.name).trim());
    out.push({
      id,
      name: String(raw.name).trim(),
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
    });
  });
  return out;
}

function validateMeals(list, ingredientIds, errors) {
  const ids = new Set();
  const names = [];
  const out = [];
  list.forEach((raw, index) => {
    const at = `meals[${index}]`;
    if (!isPlainObject(raw)) {
      errors.push(`${at}: must be an object.`);
      return;
    }
    const id = stringId(raw.id);
    if (id === null) {
      errors.push(`${at}: id must be a non-empty string.`);
      return;
    }
    if (ids.has(id)) {
      errors.push(`${at}: duplicate id.`);
      return;
    }
    const nameErr = nameError(raw.name, names);
    if (nameErr) {
      errors.push(`${at}: ${nameErr}`);
      return;
    }
    if (!Array.isArray(raw.items)) {
      errors.push(`${at}: items must be an array.`);
      return;
    }

    const items = [];
    raw.items.forEach((item, itemIndex) => {
      const atItem = `${at}: items[${itemIndex}]`;
      if (!isPlainObject(item)) {
        errors.push(`${atItem}: must be an object.`);
        return;
      }
      const ingredientId = stringId(item.ingredientId);
      if (ingredientId === null) {
        errors.push(`${atItem}: ingredientId must be a non-empty string.`);
        return;
      }
      if (!ingredientIds.has(ingredientId)) {
        errors.push(`${atItem}: unknown ingredientId.`);
        return;
      }
      const grams = field(item.grams, gramsError, `${atItem}: grams`, errors);
      if (grams === null) return;
      items.push({ ingredientId, grams });
    });

    ids.add(id);
    names.push(String(raw.name).trim());
    out.push({ id, name: String(raw.name).trim(), items });
  });
  return out;
}

function validatePlan(list, mealIds, ingredientIds, errors) {
  const ids = new Set();
  const out = [];
  list.forEach((raw, index) => {
    const at = `plan[${index}]`;
    if (!isPlainObject(raw)) {
      errors.push(`${at}: must be an object.`);
      return;
    }
    const id = stringId(raw.id);
    if (id === null) {
      errors.push(`${at}: id must be a non-empty string.`);
      return;
    }
    if (ids.has(id)) {
      errors.push(`${at}: duplicate id.`);
      return;
    }
    if (raw.kind !== "meal" && raw.kind !== "ingredient") {
      errors.push(`${at}: kind must be "meal" or "ingredient".`);
      return;
    }
    if (typeof raw.enabled !== "boolean") {
      errors.push(`${at}: enabled must be true or false.`);
      return;
    }

    let entry;
    if (raw.kind === "meal") {
      const mealId = stringId(raw.mealId);
      if (mealId === null) {
        errors.push(`${at}: mealId must be a non-empty string.`);
        return;
      }
      if (!mealIds.has(mealId)) {
        errors.push(`${at}: unknown mealId.`);
        return;
      }
      const servings = field(raw.servings, servingsError, `${at}: servings`, errors);
      if (servings === null) return;
      entry = { id, kind: "meal", mealId, servings, enabled: raw.enabled };
    } else {
      const ingredientId = stringId(raw.ingredientId);
      if (ingredientId === null) {
        errors.push(`${at}: ingredientId must be a non-empty string.`);
        return;
      }
      if (!ingredientIds.has(ingredientId)) {
        errors.push(`${at}: unknown ingredientId.`);
        return;
      }
      const grams = field(raw.grams, gramsError, `${at}: grams`, errors);
      if (grams === null) return;
      entry = { id, kind: "ingredient", ingredientId, grams, enabled: raw.enabled };
    }

    ids.add(id);
    out.push(entry);
  });
  return out;
}

/** Validates one field, pushing a path-qualified error. Returns value or null. */
function field(value, validate, label, errors) {
  const err = validate(value);
  if (err) {
    errors.push(`${label}: ${err}`);
    return null;
  }
  return typeof value === "string" ? Number(value.trim()) : value;
}

function stringId(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

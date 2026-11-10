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
export const STORAGE_VERSION = 2;

// Older files are upgraded, not rejected: version 1 stored one flat `plan`
// array, which migrateLegacyState() wraps into one named plan.
const SUPPORTED_VERSIONS = [STORAGE_VERSION, 1];

// Fixed legacy ids keep migration deterministic (running it twice over the
// same document yields the same ids, so repeated validation never churns).
export const LEGACY_PLAN_ID = "legacy-plan";
export const LEGACY_GROUP_ID = "legacy-group";

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Entry count of every plan/group, tolerant of raw or validated shapes. */
function countPlanEntries(plans) {
  let total = 0;
  for (const plan of Array.isArray(plans) ? plans : []) {
    for (const group of Array.isArray(plan?.groups) ? plan.groups : []) {
      if (Array.isArray(group?.entries)) total += group.entries.length;
    }
  }
  return total;
}

/**
 * "2 ingredients, 1 meal, 3 plans, 12 plan entries" — used in confirm
 * dialogs (import replaces everything, so counts should say what).
 */
export function describeCounts(stateLike) {
  const count = (n, singular, plural) =>
    `${n} ${n === 1 ? singular : plural ?? `${singular}s`}`;
  const ingredients = Array.isArray(stateLike?.ingredients) ? stateLike.ingredients.length : 0;
  const meals = Array.isArray(stateLike?.meals) ? stateLike.meals.length : 0;
  const plans = Array.isArray(stateLike?.plans) ? stateLike.plans.length : 0;
  return `${count(ingredients, "ingredient")}, ${count(meals, "meal")}, ${count(plans, "plan")}, ${count(countPlanEntries(stateLike?.plans), "plan entry", "plan entries")}`;
}

/**
 * Wraps a version-1 document (flat `plan` array) into the named-plans shape:
 * one plan "My plan" containing one group "All" that holds every entry.
 * Old exports, localStorage snapshots and server rows all go through here.
 */
export function migrateLegacyState(doc) {
  return {
    ingredients: doc.ingredients,
    meals: doc.meals,
    plans: [
      {
        id: LEGACY_PLAN_ID,
        name: "My plan",
        groups: [
          {
            id: LEGACY_GROUP_ID,
            name: "All",
            entries: Array.isArray(doc.plan) ? doc.plan : [],
          },
        ],
      },
    ],
    goals: doc.goals,
  };
}

/** Stored state: single key `macromaxxing:v1` with a version field. */
export function serializeStored(state) {
  return JSON.stringify({
    version: STORAGE_VERSION,
    ingredients: state.ingredients,
    meals: state.meals,
    plans: state.plans,
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
    plans: state.plans,
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
  if (!SUPPORTED_VERSIONS.includes(doc.version)) {
    return fail([
      `Unsupported version: ${stringify(doc.version)}. This app supports versions ${Math.min(...SUPPORTED_VERSIONS)}–${STORAGE_VERSION}.`,
    ]);
  }
  return { ok: true, value: doc };
}

function stringify(value) {
  return typeof value === "string" ? `"${value}"` : String(value);
}

/**
 * Validates and copies a { ingredients, meals, plans, goals } document.
 * Documents using the legacy flat `plan` array are upgraded first. Collects
 * every problem (paths like "plans[0].groups[2].entries[1]: unknown mealId")
 * and rejects the whole document if anything is wrong. Used for import
 * files, localStorage snapshots, and server-side PUT validation.
 */
export function validateState(doc) {
  if (!isPlainObject(doc)) return fail(["Expected a JSON object."]);

  if (!Array.isArray(doc.plans) && Array.isArray(doc.plan)) {
    doc = migrateLegacyState(doc); // Pre-named-plans document.
  }

  const errors = [];
  for (const key of ["ingredients", "meals", "plans"]) {
    if (!Array.isArray(doc[key])) errors.push(`${key}: must be an array.`);
  }
  if (errors.length > 0) return fail(errors);

  const ingredients = validateIngredients(doc.ingredients, errors);
  const ingredientIds = new Set(ingredients.map((i) => i.id));
  const meals = validateMeals(doc.meals, ingredientIds, errors);
  const mealIds = new Set(meals.map((m) => m.id));
  const plans = validatePlans(doc.plans, { mealIds, ingredientIds }, errors);
  const goals = validateGoals(doc, errors);

  if (errors.length > 0) return fail(errors);
  return { ok: true, state: { ingredients, meals, plans, goals } };
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
    const id = checkedId(raw.id, ids, at, errors);
    if (id === null) return;
    const name = checkedName(raw.name, names, at, errors);
    if (name === null) return;
    const calories = field(raw.caloriesPer100g, caloriesPer100gError, `${at}: caloriesPer100g`, errors);
    const protein = field(raw.proteinPer100g, macroPer100gError, `${at}: proteinPer100g`, errors);
    const carbs = field(raw.carbsPer100g, macroPer100gError, `${at}: carbsPer100g`, errors);
    const fat = field(raw.fatPer100g, macroPer100gError, `${at}: fatPer100g`, errors);
    if (protein !== null && carbs !== null && fat !== null) {
      const sumErr = macroSumError(protein, carbs, fat);
      if (sumErr) errors.push(`${at}: ${sumErr}`);
    }
    if ([calories, protein, carbs, fat].some((v) => v === null)) return;

    out.push({
      id,
      name,
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
    });
    ids.add(id);
    names.push(name);
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
    const id = checkedId(raw.id, ids, at, errors);
    if (id === null) return;
    const name = checkedName(raw.name, names, at, errors);
    if (name === null) return;
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

    out.push({ id, name, items });
    ids.add(id);
    names.push(name);
  });
  return out;
}

/**
 * Named plans → groups → entries. Group names must be unique within their
 * plan (every day can have a "Breakfast"); ids must be unique across the
 * whole document because actions address plans, groups and entries by id.
 */
function validatePlans(list, refs, errors) {
  const planIds = new Set();
  const planNames = [];
  const groupIds = new Set();
  const entryIds = new Set();
  const out = [];
  list.forEach((raw, index) => {
    const at = `plans[${index}]`;
    if (!isPlainObject(raw)) {
      errors.push(`${at}: must be an object.`);
      return;
    }
    const id = checkedId(raw.id, planIds, at, errors);
    if (id === null) return;
    if (!Array.isArray(raw.groups)) {
      errors.push(`${at}: groups must be an array.`);
      return;
    }
    const name = checkedName(raw.name, planNames, at, errors);
    if (name === null) return;

    out.push({
      id,
      name,
      groups: validatePlanGroups(raw.groups, { ...refs, groupIds, entryIds }, at, errors),
    });
    planIds.add(id);
    planNames.push(name);
  });
  return out;
}

function validatePlanGroups(list, refs, planAt, errors) {
  // Names are per-plan ("Breakfast" twice a week is fine); ids are global.
  const groupNames = [];
  const out = [];
  list.forEach((raw, index) => {
    const at = `${planAt}.groups[${index}]`;
    if (!isPlainObject(raw)) {
      errors.push(`${at}: must be an object.`);
      return;
    }
    const id = checkedId(raw.id, refs.groupIds, at, errors);
    if (id === null) return;
    if (!Array.isArray(raw.entries)) {
      errors.push(`${at}: entries must be an array.`);
      return;
    }
    const name = checkedName(raw.name, groupNames, at, errors);
    if (name === null) return;

    out.push({
      id,
      name,
      entries: validatePlanEntries(raw.entries, refs, at, errors),
    });
    refs.groupIds.add(id);
    groupNames.push(name);
  });
  return out;
}

function validatePlanEntries(list, refs, groupAt, errors) {
  const out = [];
  list.forEach((raw, index) => {
    const at = `${groupAt}.entries[${index}]`;
    if (!isPlainObject(raw)) {
      errors.push(`${at}: must be an object.`);
      return;
    }
    const id = checkedId(raw.id, refs.entryIds, at, errors);
    if (id === null) return;
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
      if (!refs.mealIds.has(mealId)) {
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
      if (!refs.ingredientIds.has(ingredientId)) {
        errors.push(`${at}: unknown ingredientId.`);
        return;
      }
      const grams = field(raw.grams, gramsError, `${at}: grams`, errors);
      if (grams === null) return;
      entry = { id, kind: "ingredient", ingredientId, grams, enabled: raw.enabled };
    }

    refs.entryIds.add(id);
    out.push(entry);
  });
  return out;
}

/** Guards an id: validates it, detects duplicates, and returns it or null.
 *  The id is only marked taken when the surrounding record is accepted, so
 *  callers add it to the set after their remaining checks pass. */
function checkedId(value, taken, at, errors) {
  const id = stringId(value);
  if (id === null) {
    errors.push(`${at}: id must be a non-empty string.`);
    return null;
  }
  if (taken.has(id)) {
    errors.push(`${at}: duplicate id.`);
    return null;
  }
  return id;
}

/** Guards a name with the shared name rules (trimmed, ≤60, unique). */
function checkedName(raw, taken, at, errors) {
  const err = nameError(raw, taken);
  if (err) {
    errors.push(`${at}: ${err}`);
    return null;
  }
  return String(raw).trim();
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

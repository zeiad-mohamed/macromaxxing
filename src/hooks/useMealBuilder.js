// useReducer store + localStorage persistence + all actions.

import { useMemo, useReducer, useEffect } from "react";
import { parseStoredState, serializeStored, validateState } from "../lib/dataIO.js";
import {
  defaultPlanGroupNames,
  goalDefaults,
  NAME_MAX_LENGTH,
} from "../lib/validation.js";

const STORAGE_KEY = "macromaxxing:v1";

const EMPTY_STATE = {
  ingredients: [],
  meals: [],
  plans: [],
  goals: { ...goalDefaults },
};

// Returns undefined for values that are not finite numbers, so bad patches
// cannot corrupt state (components validate before dispatching anyway).
function finite(value) {
  return Number.isFinite(value) ? value : undefined;
}

function sanitizePatch(patch) {
  if (!patch) return {};
  const out = {};
  if (typeof patch.name === "string") out.name = patch.name;
  if (typeof patch.ingredientId === "string") out.ingredientId = patch.ingredientId;
  if (typeof patch.enabled === "boolean") out.enabled = patch.enabled;
  const grams = finite(patch.grams);
  if (grams !== undefined) out.grams = grams;
  const servings = finite(patch.servings);
  if (servings !== undefined) out.servings = servings;
  for (const key of ["caloriesPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g"]) {
    const value = finite(patch[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function makeIngredient(data = {}) {
  return {
    id: crypto.randomUUID(),
    name: typeof data.name === "string" ? data.name.trim() : "",
    caloriesPer100g: finite(data.caloriesPer100g) ?? 0,
    proteinPer100g: finite(data.proteinPer100g) ?? 0,
    carbsPer100g: finite(data.carbsPer100g) ?? 0,
    fatPer100g: finite(data.fatPer100g) ?? 0,
  };
}

function makeMeal(name) {
  return { id: crypto.randomUUID(), name, items: [] };
}

// Name for a duplicate: keeps any "(copy N)" suffix out of the base, then
// bumps the counter until the name is unique (case-insensitive, like
// nameError) and within NAME_MAX_LENGTH. Dish "Foo" -> "Foo (copy)";
// duplicating "Foo (copy)" -> "Foo (copy 2)".
function uniqueCopyName(name, allNames) {
  const taken = new Set(
    allNames.map((other) => (typeof other === "string" ? other.trim().toLowerCase() : "")),
  );
  const match = /^(.*) \(copy(?: \d+)?\)$/.exec(typeof name === "string" ? name.trim() : "");
  const base = match ? match[1].trim() : (typeof name === "string" ? name.trim() : "");
  for (let count = 1; count <= 999; count += 1) {
    const suffix = count === 1 ? " (copy)" : ` (copy ${count})`;
    const usableBase =
      base.length + suffix.length > NAME_MAX_LENGTH
        ? base.slice(0, Math.max(0, NAME_MAX_LENGTH - suffix.length))
        : base;
    const candidate = `${usableBase}${suffix}`;
    if (!taken.has(candidate.trim().toLowerCase())) return candidate.trim();
  }
  return `${base.slice(0, NAME_MAX_LENGTH)} ${Date.now()}`;
}

function makeGroup(name, id = crypto.randomUUID()) {
  return { id, name, entries: [] };
}

/** A brand-new plan: named, seeded with the default meal groups of a day. */
function makePlan(name, id = crypto.randomUUID()) {
  return {
    id,
    name,
    groups: defaultPlanGroupNames.map((groupName) => makeGroup(groupName)),
  };
}

function makePlanEntry(entry) {
  const id = entry.id ?? crypto.randomUUID();
  if (entry.kind === "meal") {
    return {
      id,
      kind: "meal",
      mealId: entry.mealId,
      servings: finite(entry.servings) ?? 1,
      enabled: true,
    };
  }
  return {
    id,
    kind: "ingredient",
    ingredientId: entry.ingredientId,
    grams: finite(entry.grams) ?? 0,
    enabled: true,
  };
}

/**
 * Applies `mapFn(entries, group)` to every group's entries in every plan.
 */
function mapGroupEntries(plans, mapFn) {
  return plans.map((plan) => ({
    ...plan,
    groups: plan.groups.map((group) => ({ ...group, entries: mapFn(group.entries, group) })),
  }));
}

export function reducer(state, action) {
  switch (action.type) {
    case "ingredient/add":
      return { ...state, ingredients: [...state.ingredients, makeIngredient(action.data)] };

    case "ingredient/update":
      return {
        ...state,
        ingredients: state.ingredients.map((ingredient) =>
          ingredient.id === action.id
            ? { ...ingredient, ...sanitizePatch(action.patch) }
            : ingredient,
        ),
      };

    case "ingredient/delete": {
      const { id } = action;
      return {
        ...state,
        ingredients: state.ingredients.filter((ingredient) => ingredient.id !== id),
        meals: state.meals.map((meal) =>
          meal.items.some((item) => item.ingredientId === id)
            ? { ...meal, items: meal.items.filter((item) => item.ingredientId !== id) }
            : meal,
        ),
        plans: mapGroupEntries(state.plans, (entries) =>
          entries.filter(
            (entry) => !(entry.kind === "ingredient" && entry.ingredientId === id),
          ),
        ),
      };
    }

    case "ingredient/duplicate": {
      const source = state.ingredients.find((ingredient) => ingredient.id === action.id);
      if (!source) return state;
      const copy = makeIngredient({
        ...source,
        name: uniqueCopyName(source.name, state.ingredients.map((ingredient) => ingredient.name)),
      });
      const ingredients = [...state.ingredients];
      ingredients.splice(ingredients.indexOf(source) + 1, 0, copy); // Next to the original.
      return { ...state, ingredients };
    }

    case "meal/add":
      return { ...state, meals: [...state.meals, makeMeal(action.name)] };

    case "meal/duplicate": {
      const source = state.meals.find((meal) => meal.id === action.id);
      if (!source) return state;
      const copy = {
        ...makeMeal(uniqueCopyName(source.name, state.meals.map((meal) => meal.name))),
        items: source.items.map((item) => ({ ...item })), // { ingredientId, grams }
      };
      const meals = [...state.meals];
      meals.splice(meals.indexOf(source) + 1, 0, copy); // Next to the original.
      return { ...state, meals };
    }

    case "meal/update":
      return {
        ...state,
        meals: state.meals.map((meal) =>
          meal.id === action.id ? { ...meal, ...sanitizePatch(action.patch) } : meal,
        ),
      };

    case "meal/delete": {
      const { id } = action;
      return {
        ...state,
        meals: state.meals.filter((meal) => meal.id !== id),
        plans: mapGroupEntries(state.plans, (entries) =>
          entries.filter((entry) => !(entry.kind === "meal" && entry.mealId === id)),
        ),
      };
    }

    case "meal/item/add":
      return {
        ...state,
        meals: state.meals.map((meal) =>
          meal.id === action.mealId
            ? { ...meal, items: [...meal.items, { ingredientId: action.ingredientId, grams: finite(action.grams) ?? 0 }] }
            : meal,
        ),
      };

    case "meal/item/update":
      return {
        ...state,
        meals: state.meals.map((meal) =>
          meal.id === action.mealId
            ? {
                ...meal,
                items: meal.items.map((item, index) =>
                  index === action.itemIndex ? { ...item, ...sanitizePatch(action.patch) } : item,
                ),
              }
            : meal,
        ),
      };

    case "meal/item/delete":
      return {
        ...state,
        meals: state.meals.map((meal) =>
          meal.id === action.mealId
            ? { ...meal, items: meal.items.filter((_, index) => index !== action.itemIndex) }
            : meal,
        ),
      };

    case "plan/add":
      return { ...state, plans: [...state.plans, makePlan(action.name, action.id)] };

    case "plan/update":
      return {
        ...state,
        plans: state.plans.map((plan) =>
          plan.id === action.id ? { ...plan, ...sanitizePatch(action.patch) } : plan,
        ),
      };

    case "plan/delete":
      return { ...state, plans: state.plans.filter((plan) => plan.id !== action.id) };

    case "plan/duplicate": {
      const source = state.plans.find((plan) => plan.id === action.id);
      if (!source) return state;
      const copy = {
        id: crypto.randomUUID(),
        name: uniqueCopyName(source.name, state.plans.map((plan) => plan.name)),
        groups: source.groups.map((group) => ({
          ...makeGroup(group.name),
          entries: group.entries.map((entry) => ({ ...entry, id: crypto.randomUUID() })),
        })),
      };
      const plans = [...state.plans];
      plans.splice(plans.indexOf(source) + 1, 0, copy); // Next to the original.
      return { ...state, plans };
    }

    case "plan/group/add":
      return {
        ...state,
        plans: state.plans.map((plan) =>
          plan.id === action.planId
            ? { ...plan, groups: [...plan.groups, makeGroup(action.name, action.id)] }
            : plan,
        ),
      };

    case "plan/group/update":
      return {
        ...state,
        plans: state.plans.map((plan) => ({
          ...plan,
          groups: plan.groups.map((group) =>
            group.id === action.groupId
              ? { ...group, ...sanitizePatch(action.patch) }
              : group,
          ),
        })),
      };

    case "plan/group/delete":
      return {
        ...state,
        plans: state.plans.map((plan) => ({
          ...plan,
          groups: plan.groups.filter((group) => group.id !== action.groupId),
        })),
      };

    case "plan/entry/add":
      return {
        ...state,
        plans: state.plans.map((plan) => ({
          ...plan,
          groups: plan.groups.map((group) =>
            group.id === action.groupId
              ? { ...group, entries: [...group.entries, makePlanEntry(action.entry)] }
              : group,
          ),
        })),
      };

    case "plan/entry/update":
      return {
        ...state,
        plans: mapGroupEntries(state.plans, (entries) =>
          entries.map((entry) =>
            entry.id === action.entryId ? { ...entry, ...sanitizePatch(action.patch) } : entry,
          ),
        ),
      };

    case "plan/entry/delete":
      return {
        ...state,
        plans: mapGroupEntries(state.plans, (entries) =>
          entries.filter((entry) => entry.id !== action.entryId),
        ),
      };

    case "goal/update": {
      const goals = { ...state.goals };
      for (const key of ["calories", "protein", "carbs", "fat"]) {
        const value = finite(action.patch?.[key]);
        if (value !== undefined) goals[key] = value;
      }
      return { ...state, goals };
    }

    case "state/replace": {
      const next = action.nextState;
      return {
        ingredients: next.ingredients,
        meals: next.meals,
        plans: next.plans,
        goals: next.goals,
      };
    }

    default:
      return state;
  }
}

function loadInitialState() {
  if (typeof window === "undefined") {
    // Server render/prerender: no storage access; the client hydrates it.
    return EMPTY_STATE;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = parseStoredState(raw);
    return parsed.ok ? parsed.state : EMPTY_STATE;
  } catch {
    return EMPTY_STATE; // Missing, corrupt, or storage unavailable: start empty.
  }
}

export default function useMealBuilder() {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE, loadInitialState);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, serializeStored(state));
    } catch {
      // Storage full or unavailable: keep the session working in memory.
    }
  }, [state]);

  const actions = useMemo(
    () => ({
      addIngredient: (data) => dispatch({ type: "ingredient/add", data }),
      updateIngredient: (id, patch) => dispatch({ type: "ingredient/update", id, patch }),
      deleteIngredient: (id) => dispatch({ type: "ingredient/delete", id }),
      duplicateIngredient: (id) => dispatch({ type: "ingredient/duplicate", id }),

      addMeal: (name) => dispatch({ type: "meal/add", name }),
      updateMeal: (id, patch) => dispatch({ type: "meal/update", id, patch }),
      deleteMeal: (id) => dispatch({ type: "meal/delete", id }),
      duplicateMeal: (id) => dispatch({ type: "meal/duplicate", id }),

      addMealItem: (mealId, ingredientId, grams = 0) =>
        dispatch({ type: "meal/item/add", mealId, ingredientId, grams }),
      updateMealItem: (mealId, itemIndex, patch) =>
        dispatch({ type: "meal/item/update", mealId, itemIndex, patch }),
      deleteMealItem: (mealId, itemIndex) =>
        dispatch({ type: "meal/item/delete", mealId, itemIndex }),

      addPlan: (name, id) => dispatch({ type: "plan/add", name, id }),
      updatePlan: (id, patch) => dispatch({ type: "plan/update", id, patch }),
      deletePlan: (id) => dispatch({ type: "plan/delete", id }),
      duplicatePlan: (id) => dispatch({ type: "plan/duplicate", id }),

      addPlanGroup: (planId, name, presetId) =>
        dispatch({ type: "plan/group/add", planId, name, id: presetId }),
      updatePlanGroup: (groupId, patch) => dispatch({ type: "plan/group/update", groupId, patch }),
      deletePlanGroup: (groupId) => dispatch({ type: "plan/group/delete", groupId }),

      addPlanMeal: (groupId, mealId, presetId) =>
        dispatch({
          type: "plan/entry/add",
          groupId,
          entry: { kind: "meal", mealId, servings: 1, id: presetId },
        }),
      addPlanIngredient: (groupId, ingredientId, presetId) =>
        dispatch({
          type: "plan/entry/add",
          groupId,
          entry: { kind: "ingredient", ingredientId, grams: 0, id: presetId },
        }),
      updatePlanEntry: (id, patch) => dispatch({ type: "plan/entry/update", entryId: id, patch }),
      deletePlanEntry: (id) => dispatch({ type: "plan/entry/delete", entryId: id }),

      updateGoals: (patch) => dispatch({ type: "goal/update", patch }),

      // Runs incoming states through validateState so legacy flat-plan
      // documents (old server rows, old files) are upgraded before they land.
      replaceAll: (nextState) => {
        const result = validateState(nextState);
        if (result.ok) dispatch({ type: "state/replace", nextState: result.state });
      },
    }),
    [],
  );

  return { state, actions };
}

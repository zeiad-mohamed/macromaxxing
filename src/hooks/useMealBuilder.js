// useReducer store + localStorage persistence + all actions.

import { useMemo, useReducer, useEffect } from "react";
import { parseStoredState, serializeStored } from "../lib/dataIO.js";
import { goalDefaults, NAME_MAX_LENGTH } from "../lib/validation.js";

const STORAGE_KEY = "macromaxxing:v1";

const EMPTY_STATE = {
  ingredients: [],
  meals: [],
  plan: [],
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

function makePlanEntry(entry) {
  const id = crypto.randomUUID();
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
        ingredients: state.ingredients.filter((ingredient) => ingredient.id !== id),
        meals: state.meals.map((meal) =>
          meal.items.some((item) => item.ingredientId === id)
            ? { ...meal, items: meal.items.filter((item) => item.ingredientId !== id) }
            : meal,
        ),
        plan: state.plan.filter(
          (entry) => !(entry.kind === "ingredient" && entry.ingredientId === id),
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
        plan: state.plan.filter((entry) => !(entry.kind === "meal" && entry.mealId === id)),
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
      return { ...state, plan: [...state.plan, makePlanEntry(action.entry)] };

    case "plan/update":
      return {
        ...state,
        plan: state.plan.map((entry) =>
          entry.id === action.id ? { ...entry, ...sanitizePatch(action.patch) } : entry,
        ),
      };

    case "plan/delete":
      return { ...state, plan: state.plan.filter((entry) => entry.id !== action.id) };

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
        plan: next.plan,
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

      addPlanMeal: (mealId) =>
        dispatch({ type: "plan/add", entry: { kind: "meal", mealId, servings: 1 } }),
      addPlanIngredient: (ingredientId) =>
        dispatch({ type: "plan/add", entry: { kind: "ingredient", ingredientId, grams: 0 } }),
      updatePlanEntry: (id, patch) => dispatch({ type: "plan/update", id, patch }),
      deletePlanEntry: (id) => dispatch({ type: "plan/delete", id }),

      updateGoals: (patch) => dispatch({ type: "goal/update", patch }),

      replaceAll: (nextState) => dispatch({ type: "state/replace", nextState }),
    }),
    [],
  );

  return { state, actions };
}

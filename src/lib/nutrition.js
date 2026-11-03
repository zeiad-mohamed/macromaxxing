// Pure nutrition calculations only. No imports.

export function zeroNutrition() {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function addNutrition(a, b) {
  return {
    calories: (a?.calories ?? 0) + (b?.calories ?? 0),
    protein: (a?.protein ?? 0) + (b?.protein ?? 0),
    carbs: (a?.carbs ?? 0) + (b?.carbs ?? 0),
    fat: (a?.fat ?? 0) + (b?.fat ?? 0),
  };
}

/** Indexes a list of records (ingredients, meals...) by id into a Map. */
export function indexById(list) {
  const map = new Map();
  (Array.isArray(list) ? list : []).forEach((item) => {
    if (item && typeof item.id === "string") map.set(item.id, item);
  });
  return map;
}

/** Nutrition for `grams` of an ingredient. Missing ingredient contributes 0. */
export function ingredientNutrition(ingredient, grams) {
  const g = numOrZero(grams);
  if (!ingredient || g === 0) return zeroNutrition();
  const factor = g / 100;
  return {
    calories: numOrZero(ingredient.caloriesPer100g) * factor,
    protein: numOrZero(ingredient.proteinPer100g) * factor,
    carbs: numOrZero(ingredient.carbsPer100g) * factor,
    fat: numOrZero(ingredient.fatPer100g) * factor,
  };
}

/** Totals for one meal (all items summed). Missing items/ingredients give 0. */
export function mealTotals(meal, ingredientsById) {
  return (meal?.items ?? []).reduce(
    (sum, item) =>
      addNutrition(sum, ingredientNutrition(ingredientsById.get(item.ingredientId), item.grams)),
    zeroNutrition(),
  );
}

/** Totals for one plan entry, including servings / grams. */
export function planEntryTotal(entry, mealsById, ingredientsById) {
  if (!entry) return zeroNutrition();
  if (entry.kind === "meal") {
    const totals = mealTotals(mealsById.get(entry.mealId), ingredientsById);
    const servings = numOrZero(entry.servings);
    return {
      calories: totals.calories * servings,
      protein: totals.protein * servings,
      carbs: totals.carbs * servings,
      fat: totals.fat * servings,
    };
  }
  if (entry.kind === "ingredient") {
    return ingredientNutrition(ingredientsById.get(entry.ingredientId), entry.grams);
  }
  return zeroNutrition();
}

/** Sum of the totals of every enabled plan entry. */
export function grandTotals(plan, mealsById, ingredientsById) {
  return (Array.isArray(plan) ? plan : []).reduce(
    (sum, entry) => (entry?.enabled ? addNutrition(sum, planEntryTotal(entry, mealsById, ingredientsById)) : sum),
    zeroNutrition(),
  );
}

/** Display name of a plan entry, defensive when references are missing. */
function planEntryName(entry, mealsById, ingredientsById) {
  if (entry?.kind === "meal") {
    return mealsById.get(entry.mealId)?.name ?? "Missing meal";
  }
  return ingredientsById.get(entry?.ingredientId)?.name ?? "Missing ingredient";
}

/**
 * Chart legend label for a plan entry. Ingredient entries get an
 * "(ingredient)" suffix when a meal with the same name exists, so the
 * legend can tell them apart.
 */
export function planEntryLabel(entry, mealsById, ingredientsById) {
  const name = planEntryName(entry, mealsById, ingredientsById);
  if (entry?.kind === "ingredient") {
    const lower = name.toLowerCase();
    const sameNamedMeal = Array.from(mealsById.values()).some(
      (meal) => (meal?.name ?? "").trim().toLowerCase() === lower,
    );
    if (sameNamedMeal) return `${name} (ingredient)`;
  }
  return name;
}

/** Round to 1 decimal for display only. */
export function formatNumber(value) {
  return (Number.isFinite(value) ? value : 0).toFixed(1);
}

function numOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

import { useMemo } from "react";
import TextInput from "../ui/TextInput.jsx";
import NumberInput from "../ui/NumberInput.jsx";
import {
  nameError,
  macroSumError,
  CALORIES_MIN,
  CALORIES_MAX,
  MACRO_MIN,
  MACRO_MAX,
} from "../../lib/validation.js";
import { smallDangerButton } from "../ui/inputClasses.js";

const MACRO_KEYS = ["proteinPer100g", "carbsPer100g", "fatPer100g"];

export default function IngredientRow({ ingredient, ingredients, meals, plan, actions }) {
  const otherNames = useMemo(
    () => ingredients.filter((i) => i.id !== ingredient.id).map((i) => i.name),
    [ingredients, ingredient.id],
  );

  const usage = useMemo(() => {
    const mealCount = meals.filter((meal) =>
      meal.items.some((item) => item.ingredientId === ingredient.id),
    ).length;
    const planCount = plan.filter(
      (entry) => entry.kind === "ingredient" && entry.ingredientId === ingredient.id,
    ).length;
    return { mealCount, planCount };
  }, [meals, plan, ingredient.id]);

  // Keeps each macro within the "sum ≤ 100g" rule while editing (see macroErrorFor).

  function handleDelete() {
    const { mealCount, planCount } = usage;
    if (mealCount > 0 || planCount > 0) {
      const confirmed = window.confirm(
        `"${ingredient.name}" is used in ${mealCount} ${mealCount === 1 ? "meal" : "meals"} and by ${planCount} ${
          planCount === 1 ? "plan entry" : "plan entries"
        }. Deleting removes it from those meals and deletes its plan entries. Continue?`,
      );
      if (!confirmed) return;
    }
    actions.deleteIngredient(ingredient.id);
  }

  return (
    <tr className="border-t border-gray-100 align-top">
      <td className="p-2 min-w-44">
        <TextInput
          id={`ingredient-${ingredient.id}-name`}
          ariaLabel={`Name of ingredient ${ingredient.name}`}
          value={ingredient.name}
          validate={(raw) => nameError(raw, otherNames)}
          onCommit={(name) => actions.updateIngredient(ingredient.id, { name })}
          mode="inline"
        />
      </td>
      <td className="p-2 min-w-24">
        <NumberInput
          id={`ingredient-${ingredient.id}-calories`}
          ariaLabel={`Calories per 100g of ${ingredient.name}`}
          value={ingredient.caloriesPer100g}
          min={CALORIES_MIN}
          max={CALORIES_MAX}
          unit="kcal"
          onCommit={(value) =>
            actions.updateIngredient(ingredient.id, { caloriesPer100g: value })
          }
          mode="sm"
        />
      </td>
      {MACRO_KEYS.map((key) => (
        <td key={key} className="p-2 min-w-24">
          <NumberInput
            id={`ingredient-${ingredient.id}-${key}`}
            ariaLabel={`${key.replace("Per100g", " macros per 100g")} of ${ingredient.name}`}
            value={ingredient[key]}
            min={MACRO_MIN}
            max={MACRO_MAX}
            unit="g"
            onCommit={(value) => actions.updateIngredient(ingredient.id, { [key]: value })}
            extraValidate={(value) => macroErrorFor(ingredient, key, value)}
            mode="sm"
          />
        </td>
      ))}
      <td className="p-2 text-xs text-gray-500 whitespace-nowrap">
        {usageText(usage)}
      </td>
      <td className="p-2 text-right">
        <button
          type="button"
          className={smallDangerButton}
          onClick={handleDelete}
          aria-label={`Delete ingredient ${ingredient.name}`}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

function usageText({ mealCount, planCount }) {
  if (mealCount === 0 && planCount === 0) return "Unused";
  const parts = [];
  if (mealCount > 0) parts.push(`${mealCount} ${mealCount === 1 ? "meal" : "meals"}`);
  if (planCount > 0) parts.push(`${planCount} ${planCount === 1 ? "plan entry" : "plan entries"}`);
  return `Used in ${parts.join(" · ")}`;
}

// Field-specific sum check: the edited macro uses the new value, the others
// stay as committed. Returns an error message or null.
function macroErrorFor(ingredient, fieldKey, value) {
  const protein = fieldKey === "proteinPer100g" ? value : ingredient.proteinPer100g;
  const carbs = fieldKey === "carbsPer100g" ? value : ingredient.carbsPer100g;
  const fat = fieldKey === "fatPer100g" ? value : ingredient.fatPer100g;
  return macroSumError(protein, carbs, fat);
}

import { useMemo } from "react";
import NumberInput from "../ui/NumberInput.jsx";
import { ingredientNutrition, formatNumber } from "../../lib/nutrition.js";
import { GRAMS_MIN, GRAMS_MAX } from "../../lib/validation.js";
import { selectClass, smallDangerButton } from "../ui/inputClasses.js";

export default function MealItemRow({ meal, itemIndex, item, ingredients, ingredientsById, actions }) {
  const ingredient = ingredientsById.get(item.ingredientId);
  const nutrition = useMemo(
    () => ingredientNutrition(ingredient, item.grams),
    [ingredient, item.grams],
  );
  const itemName = ingredient?.name ?? "Missing ingredient";

  return (
    <li className="flex flex-wrap items-end gap-2 border-t border-gray-100 px-3 py-2 first:border-t-0">
      <div className="min-w-40 flex-1">
        <label htmlFor={`meal-${meal.id}-item-${itemIndex}-ingredient`} className="sr-only">
          Ingredient for item {itemIndex + 1} of {meal.name}
        </label>
        <select
          id={`meal-${meal.id}-item-${itemIndex}-ingredient`}
          value={item.ingredientId}
          onChange={(event) =>
            actions.updateMealItem(meal.id, itemIndex, { ingredientId: event.target.value })
          }
          className={selectClass}
        >
          {ingredient === undefined && (
            <option value={item.ingredientId}>Missing ingredient</option>
          )}
          {ingredients.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>
      <NumberInput
        id={`meal-${meal.id}-item-${itemIndex}-grams`}
        ariaLabel={`Grams of ${itemName} in ${meal.name}`}
        value={item.grams}
        min={GRAMS_MIN}
        max={GRAMS_MAX}
        unit="g"
        onCommit={(grams) => actions.updateMealItem(meal.id, itemIndex, { grams })}
        mode="sm"
        className="w-28"
      />
      <NutritionChip label="kcal" value={formatNumber(nutrition.calories)} />
      <NutritionChip label="P g" value={formatNumber(nutrition.protein)} />
      <NutritionChip label="C g" value={formatNumber(nutrition.carbs)} />
      <NutritionChip label="F g" value={formatNumber(nutrition.fat)} />
      <button
        type="button"
        className={smallDangerButton}
        onClick={() => actions.deleteMealItem(meal.id, itemIndex)}
        aria-label={`Remove ${itemName} from ${meal.name}`}
      >
        ×
      </button>
    </li>
  );
}

function NutritionChip({ label, value }) {
  return (
    <span className="min-w-16 text-right text-xs text-gray-600">
      <span className="text-gray-400">{label} </span>
      {value}
    </span>
  );
}

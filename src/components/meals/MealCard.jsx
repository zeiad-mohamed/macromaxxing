import { useMemo, useState } from "react";
import TextInput from "../ui/TextInput.jsx";
import NumberInput from "../ui/NumberInput.jsx";
import MealItemRow from "./MealItemRow.jsx";
import {
  indexById,
  mealTotals,
  formatNumber,
} from "../../lib/nutrition.js";
import { nameError } from "../../lib/validation.js";
import {
  card,
  selectClass,
  primaryButton,
  smallDangerButton,
} from "../ui/inputClasses.js";

export default function MealCard({ meal, ingredients, meals, plan, actions }) {
  const [showItems, setShowItems] = useState(false); // Accordion: hidden by default.
  const [newIngredientId, setNewIngredientId] = useState("");
  const [newGrams, setNewGrams] = useState(0);
  const [addItemKey, setAddItemKey] = useState(0);

  const itemsId = `meal-${meal.id}-items`;

  const ingredientsById = useMemo(() => indexById(ingredients), [ingredients]);
  const totals = useMemo(() => mealTotals(meal, ingredientsById), [meal, ingredientsById]);
  const planEntryCount = plan.filter(
    (entry) => entry.kind === "meal" && entry.mealId === meal.id,
  ).length;

  const otherNames = useMemo(
    () => meals.filter((other) => other.id !== meal.id).map((other) => other.name),
    [meals, meal.id],
  );

  function handleDelete() {
    if (planEntryCount > 0) {
      const confirmed = window.confirm(
        `"${meal.name}" is used by ${planEntryCount} ${
          planEntryCount === 1 ? "plan entry" : "plan entries"
        }. Deleting the meal also deletes those entries. Continue?`,
      );
      if (!confirmed) return;
    }
    actions.deleteMeal(meal.id);
  }

  function handleAddItem(event) {
    event.preventDefault();
    if (newIngredientId === "") return;
    actions.addMealItem(meal.id, newIngredientId, newGrams);
    setNewIngredientId("");
    setNewGrams(0);
    setAddItemKey((key) => key + 1); // Remount the grams input at 0.
  }

  return (
    <article className={card}>
      <div className="flex items-start gap-2 p-3 pb-2">
        <TextInput
          id={`meal-${meal.id}-name`}
          ariaLabel={`Name of meal ${meal.name}`}
          value={meal.name}
          validate={(raw) => nameError(raw, otherNames)}
          onCommit={(name) => actions.updateMeal(meal.id, { name })}
          mode="inline"
          className="flex-1"
        />
        <button
          type="button"
          className={accordionButton}
          onClick={() => setShowItems((open) => !open)}
          aria-expanded={showItems}
          aria-controls={itemsId}
        >
          Ingredients ({meal.items.length})
          <span aria-hidden="true" className="text-gray-400">
            {showItems ? "▾" : "▸"}
          </span>
        </button>
        <button
          type="button"
          className={smallDangerButton}
          onClick={handleDelete}
          aria-label={`Delete meal ${meal.name}`}
        >
          Delete
        </button>
      </div>

      {showItems && (
        <ul id={itemsId} className="border-t border-gray-100">
          {meal.items.map((item, itemIndex) => (
            <MealItemRow
              key={`${item.ingredientId}-${itemIndex}`}
              meal={meal}
              itemIndex={itemIndex}
              item={item}
              ingredients={ingredients}
              ingredientsById={ingredientsById}
              actions={actions}
            />
          ))}
          {meal.items.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500">
              No items yet — add an ingredient below.
            </li>
          )}
        </ul>
      )}

      <div className="grid grid-cols-4 gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2 text-center text-xs">
        <Total label="kcal" value={formatNumber(totals.calories)} strong />
        <Total label="P g" value={formatNumber(totals.protein)} />
        <Total label="C g" value={formatNumber(totals.carbs)} />
        <Total label="F g" value={formatNumber(totals.fat)} />
      </div>

      <form
        onSubmit={handleAddItem}
        className="flex flex-wrap items-end gap-2 border-t border-gray-100 p-3"
        noValidate
      >
        <div className="min-w-40 flex-1">
          <label htmlFor={`meal-${meal.id}-add-ingredient`} className="mb-1 block text-xs font-medium text-gray-600">
            Ingredient
          </label>
          <select
            id={`meal-${meal.id}-add-ingredient`}
            value={newIngredientId}
            onChange={(event) => setNewIngredientId(event.target.value)}
            className={selectClass}
          >
            <option value="">Select an ingredient…</option>
            {ingredients.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <NumberInput
          key={`add-grams-${addItemKey}`}
          id={`meal-${meal.id}-add-grams`}
          label="Grams"
          value={newGrams}
          min={0}
          max={10000}
          unit="g"
          onCommit={setNewGrams}
          className="w-28"
        />
        <button
          type="submit"
          className={primaryButton}
          disabled={newIngredientId === ""}
        >
          Add item
        </button>
      </form>
    </article>
  );
}

// Accordion toggle: counts items, chevron flips with open state.
const accordionButton =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";

function Total({ label, value, strong = false }) {
  return (
    <div>
      <span className="block text-[10px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span
        className={`tabular-nums ${strong ? "font-semibold text-emerald-700" : "font-medium text-gray-800"}`}
      >
        {value}
      </span>
    </div>
  );
}

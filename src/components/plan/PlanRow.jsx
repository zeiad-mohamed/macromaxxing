import { useMemo } from "react";
import NumberInput from "../ui/NumberInput.jsx";
import { planEntryTotal, formatNumber } from "../../lib/nutrition.js";
import { GRAMS_MIN, GRAMS_MAX, SERVINGS_MIN, SERVINGS_MAX } from "../../lib/validation.js";
import { smallDangerButton } from "../ui/inputClasses.js";

const BADGE_CLASSES = {
  meal: "bg-indigo-100 text-indigo-700",
  ingredient: "bg-sky-100 text-sky-700",
};

export default function PlanRow({ entry, mealsById, ingredientsById, actions }) {
  const totals = useMemo(
    () => planEntryTotal(entry, mealsById, ingredientsById),
    [entry, mealsById, ingredientsById],
  );

  const name = useMemo(
    () =>
      entry.kind === "meal"
        ? mealsById.get(entry.mealId)?.name ?? "Missing meal"
        : ingredientsById.get(entry.ingredientId)?.name ?? "Missing ingredient",
    [entry, mealsById, ingredientsById],
  );

  function handleDelete() {
    actions.deletePlanEntry(entry.id);
  }

  return (
    <tr className="border-t border-gray-100">
      <td className="p-2 text-center">
        <input
          id={`plan-${entry.id}-enabled`}
          type="checkbox"
          checked={entry.enabled}
          onChange={(event) =>
            actions.updatePlanEntry(entry.id, { enabled: event.target.checked })
          }
          aria-label={`Include ${name} in totals`}
          className="size-4 rounded border-gray-300 text-emerald-600 accent-emerald-600"
        />
      </td>
      <td className="p-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            BADGE_CLASSES[entry.kind] ?? "bg-gray-100 text-gray-600"
          }`}
        >
          {entry.kind === "meal" ? "Meal" : "Ingredient"}
        </span>
      </td>
      <td className="p-2 font-medium text-gray-800">{name}</td>
      <td className="p-2 min-w-44">
        {entry.kind === "meal" ? (
          <NumberInput
            id={`plan-${entry.id}-servings`}
            ariaLabel={`Servings of ${name}`}
            value={entry.servings}
            min={SERVINGS_MIN}
            max={SERVINGS_MAX}
            unit="servings"
            onCommit={(servings) => actions.updatePlanEntry(entry.id, { servings })}
            mode="sm"
          />
        ) : (
          <NumberInput
            id={`plan-${entry.id}-grams`}
            ariaLabel={`Grams of ${name}`}
            value={entry.grams}
            min={GRAMS_MIN}
            max={GRAMS_MAX}
            unit="g"
            onCommit={(grams) => actions.updatePlanEntry(entry.id, { grams })}
            mode="sm"
          />
        )}
      </td>
      <td className="p-2 tabular-nums">{formatNumber(totals.calories)}</td>
      <td className="p-2 tabular-nums">{formatNumber(totals.protein)}</td>
      <td className="p-2 tabular-nums">{formatNumber(totals.fat)}</td>
      <td className="p-2 tabular-nums">{formatNumber(totals.carbs)}</td>
      <td className="p-2 text-right">
        <button
          type="button"
          className={smallDangerButton}
          onClick={handleDelete}
          aria-label={`Remove ${name} from plan`}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

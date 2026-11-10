import { useMemo, useState } from "react";
import TextInput from "../ui/TextInput.jsx";
import PlanTable from "./PlanTable.jsx";
import AddToPlanForm from "./AddToPlanForm.jsx";
import { entryTotals, formatNumber } from "../../lib/nutrition.js";
import { nameError } from "../../lib/validation.js";
import { accordionButton, card, smallDangerButton } from "../ui/inputClasses.js";

/**
 * One group (e.g. Breakfast) of the active plan: editable name, enabled
 * subtotal, collapsible body (collapsed by default) holding the add control
 * and the entry table.
 */
export default function PlanGroup({
  plan,
  group,
  meals,
  ingredients,
  mealsById,
  ingredientsById,
  actions,
}) {
  const [showBody, setShowBody] = useState(false); // Collapse: hidden by default.

  const otherNames = useMemo(
    () => plan.groups.filter((other) => other.id !== group.id).map((other) => other.name),
    [plan.groups, group.id],
  );

  const totals = useMemo(
    () => entryTotals(group.entries, mealsById, ingredientsById),
    [group.entries, mealsById, ingredientsById],
  );

  const bodyId = `plan-group-${group.id}-body`;

  function handleDelete() {
    if (group.entries.length > 0) {
      const confirmed = window.confirm(
        `Delete group "${group.name}" and its ${group.entries.length} ${
          group.entries.length === 1 ? "plan entry" : "plan entries"
        }? This cannot be undone. Continue?`,
      );
      if (!confirmed) return;
    }
    actions.deletePlanGroup(group.id);
  }

  return (
    <article className={card}>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <TextInput
          id={`plan-group-${group.id}-name`}
          ariaLabel={`Name of group ${group.name}`}
          value={group.name}
          validate={(raw) => nameError(raw, otherNames)}
          onCommit={(name) => actions.updatePlanGroup(group.id, { name })}
          mode="inline"
          className="min-w-32 flex-1"
        />
        <button
          type="button"
          className={accordionButton}
          onClick={() => setShowBody((open) => !open)}
          aria-expanded={showBody}
          aria-controls={bodyId}
        >
          Entries ({group.entries.length})
          <span aria-hidden="true" className="text-gray-400">
            {showBody ? "▾" : "▸"}
          </span>
        </button>
        {group.entries.length > 0 && (
          <p className="text-xs tabular-nums text-gray-400">
            {formatNumber(totals.calories)} kcal · {formatNumber(totals.protein)}g P ·{" "}
            {formatNumber(totals.fat)}g F · {formatNumber(totals.carbs)}g C
          </p>
        )}
        <button
          type="button"
          className={smallDangerButton}
          onClick={handleDelete}
          aria-label={`Delete group ${group.name}`}
        >
          Delete
        </button>
      </div>

      {showBody && (
        <div id={bodyId}>
          <div className="border-t border-gray-100 p-3">
            <AddToPlanForm
              group={group}
              meals={meals}
              ingredients={ingredients}
              actions={actions}
            />
          </div>

          <div className="border-t border-gray-100 p-3">
            {group.entries.length === 0 ? (
              <p className="text-xs text-gray-500">
                Nothing in this group yet — add a meal or ingredient above. The same item can be added more than once.
              </p>
            ) : (
              <PlanTable
                entries={group.entries}
                groupName={group.name}
                mealsById={mealsById}
                ingredientsById={ingredientsById}
                actions={actions}
              />
            )}
          </div>
        </div>
      )}
    </article>
  );
}

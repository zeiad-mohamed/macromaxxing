import TextInput from "../ui/TextInput.jsx";
import { nameError } from "../../lib/validation.js";
import {
  smallDangerButton,
  smallSecondaryButton,
} from "../ui/inputClasses.js";

/**
 * Active plan controls: inline rename, plus duplicate (a fast way to roll a
 * day forward) and delete. Both buttons confirm before touching data. Rendered
 * inline next to the plan switcher, not as its own card.
 */
export default function PlanHeader({ plan, plans, actions }) {
  const otherNames = plans
    .filter((other) => other.id !== plan.id)
    .map((other) => other.name);

  const groupCount = plan.groups.length;
  const entryCount = plan.groups.reduce((sum, group) => sum + group.entries.length, 0);

  function handleDelete() {
    if (entryCount > 0) {
      const confirmed = window.confirm(
        `Delete plan "${plan.name}"? It contains ${groupCount} ${
          groupCount === 1 ? "group" : "groups"
        } and ${entryCount} ${entryCount === 1 ? "plan entry" : "plan entries"}. This cannot be undone. Continue?`,
      );
      if (!confirmed) return;
    }
    actions.deletePlan(plan.id);
  }

  return (
    <div className="flex flex-1 flex-wrap items-center gap-2 min-w-64">
      <TextInput
        id={`plan-${plan.id}-name`}
        ariaLabel={`Name of plan ${plan.name}`}
        value={plan.name}
        validate={(raw) => nameError(raw, otherNames)}
        onCommit={(name) => actions.updatePlan(plan.id, { name })}
        mode="inline"
        className="min-w-40 flex-1"
      />
      <span className="text-xs text-gray-400">
        {groupCount} {groupCount === 1 ? "group" : "groups"} · {entryCount}{" "}
        {entryCount === 1 ? "entry" : "entries"}
      </span>
      <button
        type="button"
        className={smallSecondaryButton}
        onClick={() => actions.duplicatePlan(plan.id)}
        aria-label={`Duplicate plan ${plan.name}`}
      >
        Duplicate
      </button>
      <button
        type="button"
        className={smallDangerButton}
        onClick={handleDelete}
        aria-label={`Delete plan ${plan.name}`}
      >
        Delete
      </button>
    </div>
  );
}

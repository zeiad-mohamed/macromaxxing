import { useRef } from "react";
import { toggleGroupButton } from "../ui/inputClasses.js";
import { nextPlanName } from "../../lib/validation.js";

/**
 * Pill bar for switching between plans (one per day, e.g. Monday…Sunday),
 * plus a quick-add for a new plan. Same radiogroup + roving-focus pattern
 * as the other toggle controls in the app.
 */
export default function PlansBar({ plans, selectedId, onSelect, onCreate }) {
  const pillRefs = useRef({});

  function handleKeys(event) {
    const index = plans.findIndex((plan) => plan.id === selectedId);
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % plans.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + plans.length) % plans.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = plans.length - 1;
    if (next === null) return;
    event.preventDefault();
    onSelect(plans[next].id);
    pillRefs.current[plans[next].id]?.focus();
  }

  function handleCreate() {
    const id = crypto.randomUUID(); // Selected right after creation.
    onCreate(nextPlanName(plans), id);
  }

  return (
    <div className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1">
      <div
        role="radiogroup"
        aria-label="Select plan"
        onKeyDown={handleKeys}
        className="flex flex-wrap gap-1"
      >
        {plans.map((plan) => (
          <button
            key={plan.id}
            ref={(el) => {
              pillRefs.current[plan.id] = el;
            }}
            type="button"
            role="radio"
            aria-checked={plan.id === selectedId}
            tabIndex={plan.id === selectedId ? 0 : -1}
            onClick={() => onSelect(plan.id)}
            className={toggleGroupButton(plan.id === selectedId)}
          >
            {plan.name}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handleCreate}
        className="-ml-0.5 rounded-md border border-dashed border-emerald-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <span aria-hidden="true">+ </span>New plan
      </button>
    </div>
  );
}

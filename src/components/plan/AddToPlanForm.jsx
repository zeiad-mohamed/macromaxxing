import { useRef, useState } from "react";
import { primaryButton, selectClass, toggleGroupButton } from "../ui/inputClasses.js";

const KINDS = [
  { id: "meal", label: "Meal", emptyHint: "No meals yet — create one in the Meals tab." },
  {
    id: "ingredient",
    label: "Ingredient",
    emptyHint: "No ingredients yet — add one in the Ingredients tab.",
  },
];

export default function AddToPlanForm({ group, meals, ingredients, actions }) {
  const [kind, setKind] = useState("meal");
  const [selectedId, setSelectedId] = useState("");
  const toggleRefs = useRef({});

  const options = kind === "meal" ? meals : ingredients;
  const emptyHint = KINDS.find((k) => k.id === kind).emptyHint;
  const canAdd = options.length > 0 && selectedId !== "";
  const selectId = `add-to-plan-${group.id}-select`;

  function selectKind(nextKind, focusIt = false) {
    setKind(nextKind);
    setSelectedId("");
    if (focusIt) toggleRefs.current[nextKind]?.focus();
  }

  function handleToggleKeys(event) {
    const index = KINDS.findIndex((k) => k.id === kind);
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % KINDS.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + KINDS.length) % KINDS.length;
    if (next === null) return;
    event.preventDefault();
    selectKind(KINDS[next].id, true);
  }

  function handleAdd(event) {
    event.preventDefault();
    if (!canAdd) return;
    if (kind === "meal") actions.addPlanMeal(group.id, selectedId);
    else actions.addPlanIngredient(group.id, selectedId);
    setSelectedId("");
  }

  return (
    <form onSubmit={handleAdd} noValidate>
      <div className="flex flex-wrap items-end gap-3">
        <div
          role="radiogroup"
          aria-label={`Add to ${group.name}: entry type`}
          onKeyDown={handleToggleKeys}
          className="flex rounded-lg bg-gray-100 p-1"
        >
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              tabIndex={kind === k.id ? 0 : -1}
              ref={(el) => {
                toggleRefs.current[k.id] = el;
              }}
              onClick={() => selectKind(k.id)}
              className={toggleGroupButton(kind === k.id)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor={selectId} className="sr-only">
            {kind === "meal" ? `Meal to add to ${group.name}` : `Ingredient to add to ${group.name}`}
          </label>
          <select
            id={selectId}
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className={selectClass}
            disabled={options.length === 0}
          >
            {options.length === 0 ? (
              <option value="">Nothing to add yet</option>
            ) : (
              <>
                <option value="">Select a {kind}…</option>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </>
            )}
          </select>
          {options.length === 0 && <p className="mt-1 text-xs text-gray-500">{emptyHint}</p>}
        </div>
        <button
          type="submit"
          className={primaryButton}
          disabled={!canAdd}
          aria-label={`Add to ${group.name}`}
        >
          Add
        </button>
      </div>
    </form>
  );
}

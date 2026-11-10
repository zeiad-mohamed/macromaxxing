import { useMemo, useState } from "react";
import TextInput from "../ui/TextInput.jsx";
import { nameError } from "../../lib/validation.js";
import { primaryButton } from "../ui/inputClasses.js";

/**
 * Creates the first plan with a name the user types (the bar's quick-add
 * covers the case where plans already exist). `onCreated(planId)` lets the
 * panel select the fresh plan immediately.
 */
export default function NewPlanForm({ plans, actions, onCreated }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  const otherNames = useMemo(() => plans.map((plan) => plan.name), [plans]);
  const canSubmit = error === null && name.trim() !== "";

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    const id = crypto.randomUUID(); // Selected right after creation.
    actions.addPlan(name.trim(), id);
    setName("");
    setError(null);
    onCreated?.(id);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col justify-center gap-3 sm:flex-row" noValidate>
      <TextInput
        id="new-plan-name"
        label="Plan name"
        value={name}
        validate={(raw) => nameError(raw, otherNames)}
        onCommit={setName}
        onErrorChange={setError}
        placeholder="e.g. Monday"
        className="max-w-xs"
        autoFocus
      />
      <div className="sm:pt-6">
        <button type="submit" className={primaryButton} disabled={!canSubmit}>
          Create plan
        </button>
      </div>
    </form>
  );
}

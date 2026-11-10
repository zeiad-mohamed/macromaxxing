import { useMemo, useState } from "react";
import TextInput from "../ui/TextInput.jsx";
import { nameError } from "../../lib/validation.js";
import { card, primaryButton } from "../ui/inputClasses.js";

/**
 * Appends a group (Breakfast-ish section) to the active plan. Names must be
 * unique within the plan; every day can reuse "Breakfast" and friends.
 */
export default function AddGroupForm({ plan, actions }) {
  const [resetKey, setResetKey] = useState(0);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  const otherNames = useMemo(() => plan.groups.map((group) => group.name), [plan.groups]);
  const canSubmit = error === null && name.trim() !== "";

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    actions.addPlanGroup(plan.id, name.trim());
    setName("");
    setError(null);
    setResetKey((key) => key + 1);
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} flex flex-col gap-3 p-4 sm:flex-row`} noValidate>
      <div className="min-w-0 flex-1 sm:max-w-xs">
        <TextInput
          key={`group-name-${resetKey}`}
          id={`add-group-name-${plan.id}`}
          label={`Add group to ${plan.name}`}
          value={name}
          validate={(raw) => nameError(raw, otherNames)}
          onCommit={setName}
          onErrorChange={setError}
          placeholder="e.g. Breakfast"
        />
      </div>
      <div className="sm:pt-6">
        <button type="submit" className={primaryButton} disabled={!canSubmit}>
          Add group
        </button>
      </div>
    </form>
  );
}

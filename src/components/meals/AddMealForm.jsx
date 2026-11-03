import { useMemo, useState } from "react";
import TextInput from "../ui/TextInput.jsx";
import { nameError } from "../../lib/validation.js";
import { card, primaryButton } from "../ui/inputClasses.js";

export default function AddMealForm({ meals, actions }) {
  const [resetKey, setResetKey] = useState(0);
  const [name, setName] = useState("");
  const [error, setError] = useState(null);

  const otherNames = useMemo(() => meals.map((meal) => meal.name), [meals]);
  const canSubmit = error === null && name.trim() !== "";

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    actions.addMeal(name);
    setName("");
    setError(null);
    setResetKey((key) => key + 1);
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} p-4`} noValidate>
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Add meal</h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <TextInput
          key={`name-${resetKey}`}
          id="add-meal-name"
          label="Meal name"
          value={name}
          validate={(raw) => nameError(raw, otherNames)}
          onCommit={setName}
          onErrorChange={setError}
          placeholder="e.g. Post-workout bowl"
          className="flex-1"
        />
        <div className="sm:pt-6">
          <button type="submit" className={primaryButton} disabled={!canSubmit}>
            Add meal
          </button>
        </div>
      </div>
    </form>
  );
}

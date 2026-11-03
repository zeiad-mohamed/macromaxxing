import { useMemo, useState } from "react";
import TextInput from "../ui/TextInput.jsx";
import NumberInput from "../ui/NumberInput.jsx";
import { nameError, macroSumError, newIngredientNameDefault, newIngredientDefaults } from "../../lib/validation.js";
import { card, primaryButton } from "../ui/inputClasses.js";

const numberFields = [
  { key: "caloriesPer100g", label: "Calories / 100g", min: 0, max: 900, unit: "kcal" },
  { key: "proteinPer100g", label: "Protein / 100g", min: 0, max: 100, unit: "g" },
  { key: "carbsPer100g", label: "Carbs / 100g", min: 0, max: 100, unit: "g" },
  { key: "fatPer100g", label: "Fat / 100g", min: 0, max: 100, unit: "g" },
];

export default function AddIngredientForm({ ingredients, actions }) {
  const [resetKey, setResetKey] = useState(0);
  const [name, setName] = useState(newIngredientNameDefault);
  const [numbers, setNumbers] = useState({ ...newIngredientDefaults });
  const [errors, setErrors] = useState({ name: null, ...blankNumberErrors() });

  const otherNames = useMemo(() => ingredients.map((i) => i.name), [ingredients]);

  const allErrorsClear = Object.values(errors).every((message) => message === null);
  const canSubmit = allErrorsClear && name.trim() !== "";

  const setError = (field) => (message) =>
    setErrors((prev) => (prev[field] === message ? prev : { ...prev, [field]: message }));

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    actions.addIngredient({ name, ...numbers });
    setErrors({ name: null, ...blankNumberErrors() });
    setName("");
    setNumbers({ ...newIngredientDefaults });
    setResetKey((key) => key + 1); // Remount inputs on their defaults.
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} p-4`} noValidate>
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Add ingredient</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput
          key={`name-${resetKey}`}
          id="add-ingredient-name"
          label="Name"
          value={name}
          validate={(raw) => nameError(raw, otherNames)}
          onCommit={setName}
          onErrorChange={setError("name")}
          placeholder="e.g. Chicken breast"
          className="sm:col-span-2"
        />
        {numberFields.map((field) => (
          <NumberInput
            key={`${field.key}-${resetKey}`}
            id={`add-ingredient-${field.key}`}
            label={field.label}
            value={numbers[field.key]}
            min={field.min}
            max={field.max}
            unit={field.unit}
            onCommit={(value) =>
              setNumbers((prev) => ({ ...prev, [field.key]: value }))
            }
            onErrorChange={setError(field.key)}
            extraValidate={
              field.key !== "caloriesPer100g"
                ? (value) =>
                    macroSumError(
                      field.key === "proteinPer100g" ? value : numbers.proteinPer100g,
                      field.key === "carbsPer100g" ? value : numbers.carbsPer100g,
                      field.key === "fatPer100g" ? value : numbers.fatPer100g,
                    )
                : null
            }
          />
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" className={primaryButton} disabled={!canSubmit}>
          Add ingredient
        </button>
      </div>
    </form>
  );
}

function blankNumberErrors() {
  return {
    caloriesPer100g: null,
    proteinPer100g: null,
    carbsPer100g: null,
    fatPer100g: null,
  };
}

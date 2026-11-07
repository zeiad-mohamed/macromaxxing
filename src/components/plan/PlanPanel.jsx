import { useMemo } from "react";
import AddToPlanForm from "./AddToPlanForm.jsx";
import PlanTable from "./PlanTable.jsx";
import SummaryCards from "./SummaryCards.jsx";
import NutritionChart from "./NutritionChart.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import {
  indexById,
  grandTotals,
  planEntryLabel,
  planEntryTotal,
} from "../../lib/nutrition.js";
import { primaryButton } from "../ui/inputClasses.js";

export default function PlanPanel({ ingredients, meals, plan, goals, actions, onGoToTab }) {
  const mealsById = useMemo(() => indexById(meals), [meals]);
  const ingredientsById = useMemo(() => indexById(ingredients), [ingredients]);

  const totals = useMemo(
    () => grandTotals(plan, mealsById, ingredientsById),
    [plan, mealsById, ingredientsById],
  );

  const chartEntries = useMemo(
    () =>
      plan
        .filter((entry) => entry.enabled)
        .map((entry) => {
          const total = planEntryTotal(entry, mealsById, ingredientsById);
          return {
            id: entry.id,
            label: planEntryLabel(entry, mealsById, ingredientsById),
            values: [total.protein, total.carbs, total.fat],
          };
        }),
    [plan, mealsById, ingredientsById],
  );

  if (meals.length === 0 && ingredients.length === 0) {
    return (
      <section className="space-y-4">
        <EmptyState
          title="Nothing to plan yet"
          message="Your plan is built from meals and ingredients, so add at least one food in the Ingredients tab first."
        >
          <button
            type="button"
            className={primaryButton}
            onClick={() => onGoToTab("ingredients")}
          >
            Go to Ingredients
          </button>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <AddToPlanForm meals={meals} ingredients={ingredients} actions={actions} />
      {plan.length === 0 ? (
        <EmptyState
          title="Nothing on the plan yet"
          message="Pick a meal or ingredient above to add your first entry. The same item can be added more than once."
        />
      ) : (
        <PlanTable
          plan={plan}
          mealsById={mealsById}
          ingredientsById={ingredientsById}
          actions={actions}
        />
      )}
      <SummaryCards
        totals={totals}
        goals={goals}
        onGoalCommit={(field, value) => actions.updateGoals({ [field]: value })}
      />
      <NutritionChart entries={chartEntries} goals={goals} />
    </section>
  );
}

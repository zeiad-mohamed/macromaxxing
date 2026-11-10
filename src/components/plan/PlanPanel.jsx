import { useMemo, useState } from "react";
import PlansBar from "./PlansBar.jsx";
import PlanHeader from "./PlanHeader.jsx";
import PlanGroup from "./PlanGroup.jsx";
import NewPlanForm from "./NewPlanForm.jsx";
import AddGroupForm from "./AddGroupForm.jsx";
import SummaryCards from "./SummaryCards.jsx";
import NutritionChart from "./NutritionChart.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import {
  indexById,
  entryTotals,
  planEntries,
  planEntryLabel,
  planEntryTotal,
} from "../../lib/nutrition.js";
import { primaryButton } from "../ui/inputClasses.js";

export default function PlanPanel({ plans, ingredients, meals, goals, actions, onGoToTab }) {
  const [activePlanId, setActivePlanId] = useState(null);

  const mealsById = useMemo(() => indexById(meals), [meals]);
  const ingredientsById = useMemo(() => indexById(ingredients), [ingredients]);

  const activePlan =
    plans.find((plan) => plan.id === activePlanId) ?? plans[0] ?? null;

  const entries = useMemo(
    () => (activePlan ? planEntries(activePlan) : []),
    [activePlan],
  );

  const totals = useMemo(
    () => entryTotals(entries, mealsById, ingredientsById),
    [entries, mealsById, ingredientsById],
  );

  const chartEntries = useMemo(
    () =>
      entries
        .filter((entry) => entry.enabled)
        .map((entry) => {
          const total = planEntryTotal(entry, mealsById, ingredientsById);
          return {
            id: entry.id,
            label: planEntryLabel(entry, mealsById, ingredientsById),
            values: [total.protein, total.fat, total.carbs],
          };
        }),
    [entries, mealsById, ingredientsById],
  );

  if (meals.length === 0 && ingredients.length === 0 && plans.length === 0) {
    return (
      <section className="space-y-4">
        <EmptyState
          title="Nothing to plan yet"
          message="Your plans are built from meals and ingredients, so add at least one food in the Ingredients tab first."
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

  if (plans.length === 0) {
    return (
      <section className="space-y-4">
        <EmptyState
          title="No plans yet"
          message="Name your first plan — one plan per day works well, so Monday is a fine start. Every plan starts with Breakfast, Lunch, Dinner and Snacks groups."
        >
          <NewPlanForm plans={plans} actions={actions} onCreated={setActivePlanId} />
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <PlansBar
        plans={plans}
        selectedId={activePlan?.id ?? null}
        onSelect={setActivePlanId}
        onCreate={(name, id) => {
          actions.addPlan(name, id);
          setActivePlanId(id); // Jump straight into the fresh plan.
        }}
      />
      {activePlan && <PlanHeader plan={activePlan} plans={plans} actions={actions} />}
      {activePlan && activePlan.groups.length > 0 ? (
        activePlan.groups.map((group) => (
          <PlanGroup
            key={group.id}
            plan={activePlan}
            group={group}
            meals={meals}
            ingredients={ingredients}
            mealsById={mealsById}
            ingredientsById={ingredientsById}
            actions={actions}
          />
        ))
      ) : (
        <EmptyState
          title="No groups in this plan yet"
          message="Plans are divided into groups like Breakfast, Lunch or Snacks. Add the first group below."
        />
      )}
      {activePlan && <AddGroupForm plan={activePlan} actions={actions} />}
      <SummaryCards
        totals={totals}
        goals={goals}
        onGoalCommit={(field, value) => actions.updateGoals({ [field]: value })}
      />
      <NutritionChart entries={chartEntries} goals={goals} />
    </section>
  );
}

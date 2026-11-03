import AddMealForm from "./AddMealForm.jsx";
import MealCard from "./MealCard.jsx";
import EmptyState from "../ui/EmptyState.jsx";
import { primaryButton } from "../ui/inputClasses.js";

export default function MealsPanel({ ingredients, meals, plan, actions, onGoToTab }) {
  return (
    <section className="space-y-4">
      <AddMealForm meals={meals} actions={actions} />
      {ingredients.length === 0 ? (
        <EmptyState
          title="No ingredients yet"
          message="Meals are built from ingredients, so add at least one food in the Ingredients tab first."
        >
          <button
            type="button"
            className={primaryButton}
            onClick={() => onGoToTab("ingredients")}
          >
            Go to Ingredients
          </button>
        </EmptyState>
      ) : meals.length === 0 ? (
        <EmptyState
          title="No meals yet"
          message="Name your first recipe above, then add ingredients to it."
        />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              ingredients={ingredients}
              meals={meals}
              plan={plan}
              actions={actions}
            />
          ))}
        </div>
      )}
    </section>
  );
}

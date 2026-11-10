import AddIngredientForm from "./AddIngredientForm.jsx";
import IngredientTable from "./IngredientTable.jsx";
import EmptyState from "../ui/EmptyState.jsx";

export default function IngredientsPanel({ ingredients, meals, plans, actions }) {
  return (
    <section className="space-y-4">
      <AddIngredientForm ingredients={ingredients} actions={actions} />
      {ingredients.length === 0 ? (
        <EmptyState
          title="No ingredients yet"
          message="Add your first food above — calories and macros are per 100g."
        />
      ) : (
        <IngredientTable ingredients={ingredients} meals={meals} plans={plans} actions={actions} />
      )}
    </section>
  );
}

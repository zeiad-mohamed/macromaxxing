import IngredientRow from "./IngredientRow.jsx";

const COLUMNS = [
  "Name",
  "Calories / 100g",
  "Protein / 100g",
  "Fat / 100g",
  "Carbs / 100g",
  "Used in",
  "",
];

export default function IngredientTable({ ingredients, meals, plans, actions }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <caption className="sr-only">Ingredients with their nutrition per 100g</caption>
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            {COLUMNS.map((column, index) => (
              <th key={column || "delete"} scope="col" className="p-2">
                <span className={index === COLUMNS.length - 1 ? "sr-only" : undefined}>
                  {column || "Actions"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ingredients.map((ingredient) => (
            <IngredientRow
              key={ingredient.id}
              ingredient={ingredient}
              ingredients={ingredients}
              meals={meals}
              plans={plans}
              actions={actions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

import PlanRow from "./PlanRow.jsx";

const COLUMNS = [
  "Include",
  "Type",
  "Name",
  "Amount",
  "Calories (kcal)",
  "Protein (g)",
  "Carbs (g)",
  "Fat (g)",
  "",
];

export default function PlanTable({ plan, mealsById, ingredientsById, actions }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <caption className="sr-only">Meal plan entries with calculated nutrition</caption>
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
            {COLUMNS.map((column, index) => (
              <th key={column || "delete"} scope="col" className="p-2 whitespace-nowrap">
                <span className={index === COLUMNS.length - 1 ? "sr-only" : undefined}>
                  {column || "Actions"}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plan.map((entry) => (
            <PlanRow
              key={entry.id}
              entry={entry}
              mealsById={mealsById}
              ingredientsById={ingredientsById}
              actions={actions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

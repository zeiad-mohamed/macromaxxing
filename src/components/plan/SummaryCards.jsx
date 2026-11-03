import { formatNumber } from "../../lib/nutrition.js";

export default function SummaryCards({ totals }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
      <Card label="Total Calories" value={formatNumber(totals.calories)} unit="kcal" accent />
      <Card label="Total Protein" value={formatNumber(totals.protein)} unit="g" />
      <Card label="Total Carbs" value={formatNumber(totals.carbs)} unit="g" />
      <Card label="Total Fat" value={formatNumber(totals.fat)} unit="g" />
    </div>
  );
}

function Card({ label, value, unit, accent = false }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
        {value}
        <span className={`ml-1 text-sm font-medium ${accent ? "text-emerald-600" : "text-gray-400"}`}>
          {unit}
        </span>
      </p>
    </div>
  );
}

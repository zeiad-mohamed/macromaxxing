import NumberInput from "../ui/NumberInput.jsx";
import { formatNumber, goalProgress } from "../../lib/nutrition.js";
import {
  GOAL_CALORIES_MAX,
  GOAL_MACRO_MAX,
} from "../../lib/validation.js";

// One card per macro total. Each card carries its own goal: an inline input
// (0 = no goal, which hides the progress display) and a progress bar.
const GOAL_FIELDS = [
  {
    key: "calories",
    label: "Total Calories",
    unit: "kcal",
    accent: true,
    max: GOAL_CALORIES_MAX,
    goalAria: "Calorie goal",
  },
  {
    key: "protein",
    label: "Total Protein",
    unit: "g",
    max: GOAL_MACRO_MAX,
    goalAria: "Protein goal",
  },
  {
    key: "carbs",
    label: "Total Carbs",
    unit: "g",
    max: GOAL_MACRO_MAX,
    goalAria: "Carb goal",
  },
  {
    key: "fat",
    label: "Total Fat",
    unit: "g",
    max: GOAL_MACRO_MAX,
    goalAria: "Fat goal",
  },
];

export default function SummaryCards({ totals, goals, onGoalCommit }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {GOAL_FIELDS.map((field) => (
        <Card
          key={field.key}
          field={field}
          value={totals[field.key]}
          goal={goals?.[field.key] ?? 0}
          onGoalCommit={onGoalCommit}
        />
      ))}
    </div>
  );
}

function Card({ field, value, goal, onGoalCommit }) {
  const { key, label, unit, accent, max, goalAria } = field;
  const progress = goalProgress(value, goal);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p aria-live="polite" className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
        {formatNumber(value)}
        <span className={`ml-1 text-sm font-medium ${accent ? "text-emerald-600" : "text-gray-400"}`}>
          {unit}
        </span>
      </p>

      <div className="mt-2">
        <NumberInput
          id={`goal-${key}`}
          ariaLabel={goalAria}
          value={goal}
          min={0}
          max={max}
          unit={unit}
          mode="sm"
          onCommit={(next) => onGoalCommit(key, next)}
          className="max-w-24"
        />
      </div>

      {progress && (
        <GoalProgress progress={progress} label={`${label} progress toward goal`} />
      )}
    </div>
  );
}

/** Thin progress bar; amber once the total passes the goal. */
function GoalProgress({ progress, label }) {
  const percent = progress.percent;
  const width = Math.max(0, Math.min(100, percent));
  const barColor = progress.over ? "bg-amber-500" : "bg-emerald-500";
  const textColor = progress.over ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="mt-2">
      <p aria-live="polite" className={`text-xs font-semibold ${textColor}`}>
        {Math.round(percent)}% of goal
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100"
      >
        <div className={`h-full rounded-full transition-[width] ${barColor}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

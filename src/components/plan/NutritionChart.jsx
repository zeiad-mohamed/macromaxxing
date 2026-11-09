import { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import EmptyState from "../ui/EmptyState.jsx";
import { formatNumber } from "../../lib/nutrition.js";

// Palette for entry datasets. Kept distinct from the emerald accent so the
// accent color never masquerades as a macro series.
const PALETTE = [
  "#6366f1", // indigo
  "#f97316", // orange
  "#3b82f6", // blue
  "#ec4899", // pink
  "#f59e0b", // amber
  "#a855f7", // purple
  "#ef4444", // red
  "#0ea5e9", // sky
  "#d946ef", // fuchsia
];

/**
 * Inline Chart.js plugin: draws a dashed horizontal goal mark inside the
 * band of each macro category that has a daily goal set. The accent color is
 * fine here — the mark deliberately stands out from the entry series.
 */
const dailyGoalLines = {
  id: "dailyGoalLines",
  afterDatasetsDraw(chart) {
    const values = chart.options.plugins?.dailyGoalLines?.values;
    if (!Array.isArray(values)) return;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return;
    const band = xScale.getPixelForValue(1) - xScale.getPixelForValue(0);
    if (!Number.isFinite(band) || band <= 0) return;
    const half = band * 0.38;

    const { ctx } = chart;
    ctx.save();
    ctx.strokeStyle = "#059669"; // emerald-600
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    values.forEach((value, index) => {
      if (!(Number.isFinite(value) && value > 0)) return;
      const center = xScale.getPixelForValue(index);
      ctx.beginPath();
      ctx.moveTo(center - half, yScale.getPixelForValue(value));
      ctx.lineTo(center + half, yScale.getPixelForValue(value));
      ctx.stroke();
    });
    ctx.restore();
  },
};

/** A goal only shows once it is set (> 0); NaN would break the axis max. */
function goalValue(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Stacked bar chart: one dataset per enabled plan entry, bars are the three
 * macros. Dashed marks show the daily goals when set. The Chart instance is
 * updated in place and destroyed on unmount so React StrictMode never leaves
 * a duplicate chart on the canvas.
 */
export default function NutritionChart({ entries, goals }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const hasData = entries.length > 0 && entries.some((e) => e.values.some((v) => v > 1e-9));

  const macroGoals = useMemo(
    () => (goals ? [goalValue(goals.protein), goalValue(goals.fat), goalValue(goals.carbs)] : [0, 0, 0]),
    [goals],
  );
  const goalMax = Math.max(...macroGoals, 0);

  const goalCaptionParts = goals
    ? [
        goalValue(goals.calories) > 0 && `${formatNumber(goals.calories)} kcal`,
        macroGoals[0] > 0 && `${formatNumber(macroGoals[0])} g protein`,
        macroGoals[1] > 0 && `${formatNumber(macroGoals[1])} g fat`,
        macroGoals[2] > 0 && `${formatNumber(macroGoals[2])} g carbs`,
      ].filter(Boolean)
    : [];
  const hasGoals = goalCaptionParts.length > 0;

  const data = useMemo(
    () => ({
      labels: ["Protein", "Fat", "Carbs"],
      datasets: entries.map((entry, index) => ({
        label: entry.label,
        data: entry.values,
        backgroundColor: PALETTE[index % PALETTE.length],
        borderWidth: 0,
        maxBarThickness: 72,
      })),
    }),
    [entries],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        dailyGoalLines: { values: macroGoals },
        legend: {
          display: entries.length > 1,
          position: "top",
          labels: { boxWidth: 12, boxHeight: 12 },
        },
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)} g`,
          },
        },
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: {
          stacked: true,
          beginAtZero: true,
          // Goal marks above the bars must still be on the scale: suggestedMax
          // only raises the axis, never shrinks it below the bars.
          suggestedMax: goalMax > 0 ? goalMax : undefined,
          title: { display: true, text: "Grams" },
        },
      },
    }),
    [entries, macroGoals, goalMax],
  );

  useEffect(() => {
    if (!hasData || !canvasRef.current) {
      // The plate emptied out: drop the chart with the canvas.
      chartRef.current?.destroy();
      chartRef.current = null;
      return;
    }
    if (chartRef.current) {
      chartRef.current.data = data;
      chartRef.current.options = options;
      chartRef.current.update();
    } else {
      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data,
        options,
        plugins: [dailyGoalLines],
      });
    }
  }, [hasData, data, options]);

  useEffect(() => {
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  if (!hasData) {
    return (
      <EmptyState
        title="No macros to chart yet"
        message="Nothing on the plate yet. Add a meal or ingredient to your plan and enable it to start maxxing."
      />
    );
  }

  return (
    <figure className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <figcaption className="mb-3 text-sm font-semibold text-gray-800">
        Macros by plan entry
        {hasGoals && (
          <span className="mt-1 block text-xs font-normal text-gray-500">
            Daily goals (dashed marks): {goalCaptionParts.join(" · ")}
          </span>
        )}
      </figcaption>
      <div className="h-72 sm:h-80">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Stacked bar chart showing grams of protein, fat, and carbs for each enabled plan entry${
            hasGoals ? ". Dashed marks inside a category show that macro's daily goal." : ""
          }`}
        />
      </div>
    </figure>
  );
}

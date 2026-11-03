import { useEffect, useMemo, useRef } from "react";
import Chart from "chart.js/auto";
import EmptyState from "../ui/EmptyState.jsx";

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
 * Stacked bar chart: one dataset per enabled plan entry, bars are the three
 * macros. The Chart instance is updated in place and destroyed on unmount so
 * React StrictMode never leaves a duplicate chart on the canvas.
 */
export default function NutritionChart({ entries }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const hasData = entries.length > 0 && entries.some((e) => e.values.some((v) => v > 1e-9));

  const data = useMemo(
    () => ({
      labels: ["Protein", "Carbs", "Fat"],
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
          title: { display: true, text: "Grams" },
        },
      },
    }),
    [entries],
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
      chartRef.current = new Chart(canvasRef.current, { type: "bar", data, options });
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
      </figcaption>
      <div className="h-72 sm:h-80">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Stacked bar chart showing protein, carbs, and fat grams for each enabled plan entry"
        />
      </div>
    </figure>
  );
}

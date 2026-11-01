Create a single-page **meal builder** app implemented in the current project, which is a **fresh React (Vite) install**.

## Tech requirements

Use **React (functional components + hooks)** with **Tailwind CSS** and **Chart.js**.

Do **not** use React Router, state management libraries, or any libraries beyond `chart.js` (and Tailwind).

Everything lives inside this existing Vite project. Do not create a new package or build setup — use the existing `npm run dev` / `npm run build` scripts.

## File layout

Organize the code into separate, small files instead of one blob:

```
src/
  main.jsx                  # mount the app, import CSS
  App.jsx                   # composition root: top-level layout + state wiring
  index.css                 # Tailwind entry point
  lib/
    nutrition.js            # pure functions: calculations only, no UI
  hooks/
    useIngredients.js       # custom hook: ingredient state + localStorage persistence
  components/
    AddIngredientForm.jsx   # form to add a new ingredient
    IngredientTable.jsx     # table of ingredients (editable rows, delete buttons)
    IngredientRow.jsx       # one editable row
    SummaryCards.jsx        # the four totals cards
    NutritionChart.jsx      # the stacked Chart.js bar chart
```

Pure calculation logic goes in `nutrition.js` with no imports. State and persistence stay in the `useIngredients` hook. Components receive data and callbacks via props.

## Features

The app lets the user build a meal from ingredients.

Each ingredient has:

* Name
* Calories per 100g
* Protein per 100g
* Carbs per 100g
* Fat per 100g
* Grams used in the meal
* Enabled (checkbox)

Persist all ingredients in **localStorage** and restore them when the page loads.

## UI

The page contains:

1. A form to add a new ingredient.
2. A table showing all ingredients.
3. A summary showing:

   * Total Calories
   * Total Protein
   * Total Carbs
   * Total Fat
4. A Chart.js stacked bar chart.

## Ingredient table

Each row contains:

* Include checkbox
* Name
* Calories/100g
* Protein/100g
* Carbs/100g
* Fat/100g
* Grams
* Actual Calories
* Actual Protein
* Actual Carbs
* Actual Fat
* Delete button

All fields except the calculated values are editable directly in the table (controlled inputs or local row state). The calculated columns are derived values and are read-only.

Any change immediately:

* Saves to localStorage
* Updates the totals
* Updates the chart

The Delete button removes the ingredient.

## Calculations

For each ingredient:

```
factor = grams / 100

Calories = caloriesPer100g × factor
Protein = proteinPer100g × factor
Carbs = carbsPer100g × factor
Fat = fatPer100g × factor
```

Only enabled ingredients count toward the totals and the chart.

## Summary

Display four cards showing:

* Total Calories (kcal)
* Total Protein (g)
* Total Carbs (g)
* Total Fat (g)

They update automatically whenever anything changes (derive totals with `useMemo` from the ingredients state).

## Chart

One **stacked bar chart** using Chart.js.

The x-axis has four bars:

* Calories
* Protein
* Carbs
* Fat

Each ingredient is its own dataset so the bars stack by ingredient.

Disabled ingredients must not appear in the chart.

The chart updates whenever ingredients are added, edited, deleted, or enabled/disabled (rebuild datasets from state and update the chart instance — or use a React Chart.js wrapper).

## Styling

Use Tailwind CSS utilities (added to the project properly, not via CDN).

Clean, modern, responsive layout using cards, spacing, rounded corners, and subtle shadows. Remove the Vite starter boilerplate content and styles from `App.jsx` / `index.css` / `App.css`.

## Code quality

Small functions and components instead of one large block. Avoid duplicated code. The app should run with `npm run dev` from this project.

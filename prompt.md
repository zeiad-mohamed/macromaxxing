Create a single-page **meal builder** app called **MacroMaxxing**, implemented in the current project, which is a **fresh React (Vite) install**.

## Tech requirements

Use **React (functional components + hooks)** with **Tailwind CSS** and **Chart.js**.

Do **not** use React Router, external state management libraries, or any libraries beyond `chart.js` (and Tailwind). Use `useReducer` + `useMemo` for state; React Context is allowed if prop drilling gets unwieldy.

Everything lives inside this existing Vite project. Do not create a new package or build setup. Use the existing `npm run dev` / `npm run build` scripts. Add Tailwind properly (not via CDN).

## Concept

The app has three levels:

1. **Ingredients**: reusable foods with nutrition per 100g.
2. **Meals**: named recipes built from ingredients, each with a gram amount.
3. **Plan**: a table of entries that drives all totals and the chart. Each entry is either a **meal** (with servings) or a **standalone ingredient** (with grams).

## Branding

The app is called **MacroMaxxing**, with the tagline **"Stack your plate. Max your macros."**

- Show the name and tagline in the header in `App.jsx`. Style the name as "Macro" in the accent color and "Maxxing" in a heavier font weight.
- Set the page `<title>` in `index.html` to "MacroMaxxing" and replace the default Vite favicon with an emoji favicon (e.g. 🍽️) using an inline SVG data URL.
- Tone of UI copy is casual and upbeat, but labels, errors, and validation messages stay clear and plain. Never sacrifice clarity for jokes. Tab labels stay literal: **Ingredients / Meals / Plan**.
- Use a bold, modern look: one strong accent color (e.g. emerald or lime) used consistently for buttons, active tabs, and key highlights, with neutral grays elsewhere. Keep the macro colors for the chart distinct from the accent.

## Data model

```
Ingredient: { id, name, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g }
Meal:       { id, name, items: [{ ingredientId, grams }] }
PlanEntry:  one of
  { id, kind: "meal",       mealId,       servings, enabled }
  { id, kind: "ingredient", ingredientId, grams,    enabled }
```

- Meals reference ingredients by `id`. Plan entries reference meals or ingredients by `id`. Never copy nutrition values or names into meals or plan entries. Everything is derived.
- Generate ids with `crypto.randomUUID()`.

## File layout

```
src/
  main.jsx                      # mount the app, import CSS
  App.jsx                       # composition root: header, tabs, layout
  index.css                     # Tailwind entry point
  lib/
    nutrition.js                # pure calculations only, no imports
    validation.js               # pure validators and defaults, no imports
    dataIO.js                   # pure: serialize/parse/validate export files (imports validation.js only)
  hooks/
    useMealBuilder.js           # useReducer store + localStorage persistence + actions
  components/
    ui/
      NumberInput.jsx           # shared numeric input with validation display
      EmptyState.jsx            # shared "nothing here yet" message
    ingredients/
      IngredientsPanel.jsx
      AddIngredientForm.jsx
      IngredientTable.jsx
      IngredientRow.jsx
    meals/
      MealsPanel.jsx
      AddMealForm.jsx           # create a meal (name)
      MealCard.jsx              # one meal: name, items, meal totals, delete
      MealItemRow.jsx           # ingredient select + grams + calculated values
    plan/
      PlanPanel.jsx             # add-to-plan control, table, summary, chart
      AddToPlanForm.jsx         # kind toggle (Meal | Ingredient) + select + Add
      PlanTable.jsx
      PlanRow.jsx               # handles both entry kinds
      SummaryCards.jsx          # the four totals cards
      NutritionChart.jsx        # stacked Chart.js bar chart
    ImportExportBar.jsx         # export/import JSON buttons
```

Pure calculation logic goes in `lib/` with no React imports. State and persistence stay in `useMealBuilder`. Components receive data and callbacks via props (or context).

## Features

### Ingredients tab

- Form to add an ingredient: name, calories/100g, protein/100g, carbs/100g, fat/100g.
- Table of all ingredients with every field editable inline and a Delete button.
- Show how many meals and how many plan entries use each ingredient.

### Meals tab

- Form to create a meal (name).
- Each meal is a card containing a list of items. Each item is an ingredient (chosen from a select of existing ingredients) plus grams.
- Items show calculated Calories / Protein / Carbs / Fat. The card shows meal totals.
- Meal name, item ingredient and item grams are editable. Items can be added and removed. Meals can be deleted.
- If there are no ingredients yet, show an empty state pointing the user to the Ingredients tab.

### Plan tab

- An add-to-plan control (`AddToPlanForm`): a **Meal | Ingredient** toggle, a select listing the existing items of the chosen kind, and an Add button. The same meal or ingredient may be added more than once.
  - If the chosen kind has no items yet, disable Add and show a short hint pointing to the relevant tab.
- Plan table columns: Include checkbox, Type (a small "Meal" / "Ingredient" badge), Name, Amount (editable: **servings** for meal entries, **grams** for ingredient entries, with the unit shown next to the input), Calories, Protein, Carbs, Fat (calculated, read-only), Delete button.
- Below the table: the four summary cards and the chart.
- If there are no meals **and** no ingredients, show an empty state pointing the user to the Ingredients tab.

## Calculations (`nutrition.js`)

```
factor = grams / 100

Ingredient nutrition = per100g values × factor
Meal totals          = sum of its items' nutrition
Plan entry total     = kind "meal":       meal totals × servings
                       kind "ingredient": ingredient nutrition for its grams
Grand totals         = sum of plan entry totals where enabled === true
```

- Items or entries whose referenced ingredient or meal no longer exists contribute 0 (defensive, even though deletes cascade).
- Only enabled plan entries count toward the totals and the chart.
- Derive all values with `useMemo` from state. Never store calculated values.

## Defaults

- Every numeric field in a new ingredient defaults to **0** (calories, protein, carbs, fat). A new meal item's grams default to **0**. A new standalone-ingredient plan entry's grams default to **0**.
- A new meal plan entry has **servings = 1**. All new plan entries have **enabled = true**.
- Name inputs default to an empty string.

## Validation (`validation.js`)

- **Names** (ingredient and meal): trimmed, required, max 60 characters, unique case-insensitively within their own list.
- **Numbers**: must be finite, **non-negative**. Reject `NaN`, negatives and non-numeric text.
  - Calories/100g: 0–900
  - Protein, Carbs, Fat per 100g: 0–100 each, and their sum must be ≤ 100
  - Grams (meal items and plan ingredient entries): 0–10000
  - Servings: 0–100
- While typing, an input may be temporarily empty. On blur an empty numeric field is committed as **0**.
- Invalid values are **not saved**. Show an inline error message and a red border on that field, and keep the last valid value in state.
- Add forms: disable the submit button, or block submit, while invalid, and show the errors.
- All validators are pure functions returning an error message string or `null`, and are reused by the forms, inline edits, and the JSON importer.

## Persistence

- Persist all state (ingredients, meals, plan) under a **single localStorage key** `macromaxxing:v1` with a `version` field.
- Restore on load. If the stored data is missing, corrupt, or fails validation, fall back to empty state without crashing.
- Every change saves immediately.

## Export / Import (JSON)

- **Export** button downloads `macromaxxing-YYYY-MM-DD.json` containing:
  ```
  { "app": "macromaxxing", "version": 1, "exportedAt": ISO string,
    "ingredients": [...], "meals": [...], "plan": [...] }
  ```
- **Import** button accepts a `.json` file via a file input. It parses with `dataIO.js` and validates everything with the same rules as above. It rejects files whose `app` field is not `"macromaxxing"` or whose `version` is unsupported. It also checks referential integrity: every meal item's `ingredientId` must exist, every `kind: "meal"` entry's `mealId` must exist, every `kind: "ingredient"` entry's `ingredientId` must exist, and every entry's `kind` must be `"meal"` or `"ingredient"`.
- If the file is invalid, import nothing and show a clear error list (e.g. "plan[1]: unknown ingredientId"). Never partially import.
- A valid import **replaces** all current data, after a confirmation prompt that states the counts being replaced and imported.
- Parsing and validation live in `dataIO.js` as pure functions. The file download and file reading happen in `ImportExportBar.jsx`.

## Delete behavior

- Deleting an ingredient that is used in meals or in plan entries asks for confirmation (listing how many meals and plan entries are affected), then removes it from those meals' items and removes the plan entries that reference it.
- Deleting a meal that is in the plan asks for confirmation, then removes its plan entries.
- Deleting anything unused needs no confirmation.
- All cascade logic lives in the reducer.

## Summary

Four cards: Total Calories (kcal), Total Protein (g), Total Carbs (g), Total Fat (g). Totals come from enabled plan entries and update on any change. Round to 1 decimal for display only.

## Chart

One **stacked bar chart** using Chart.js, in `NutritionChart.jsx`.

- Shows **only macros**. Calories must not appear.
- X-axis has three bars: Protein, Carbs, Fat.
- Each **enabled plan entry** is its own dataset, labeled with the meal or ingredient name, so bars stack by entry. Its values are that entry's protein/carbs/fat (including servings or grams). Append "(ingredient)" to the label of ingredient entries when a meal with the same name exists, so legend labels stay distinguishable.
- Disabled entries do not appear.
- Y-axis is in grams, with a legend and tooltips.
- **Empty state**: if there are no enabled plan entries (or the totals are all 0), do not render the chart. Show a message that says what to do, for example: "Nothing on the plate yet. Add a meal or ingredient to your plan and enable it to start maxxing."
- The chart updates on any change to ingredients, meals, plan entries, amounts, or enabled state. Update the chart instance in place (or recreate it) and **destroy it on unmount** so React StrictMode does not cause duplicate-canvas errors.

## Styling

Use Tailwind utilities. Clean, modern, responsive layout using cards, spacing, rounded corners, and subtle shadows. Tabs for Ingredients / Meals / Plan, held in local `useState` (no router). Tables scroll horizontally on small screens. Remove all Vite starter boilerplate content and styles from `App.jsx` / `index.css` / `App.css`.

## Accessibility

Label every input, associate error messages with their inputs (`aria-describedby`), use real `<button>` and `<table>` elements, and make tabs and the Meal | Ingredient toggle keyboard-operable.

## Code quality

Small functions and components instead of one large block. Avoid duplicated code (use the shared `NumberInput` for every numeric field, and share row-calculation logic between meal items and plan entries). The app must run with `npm run dev` and build with `npm run build` without errors or console warnings.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useMealBuilder from "@/hooks/useMealBuilder.js";
import useServerSession from "@/hooks/useServerSession.js";
import useCloudSync from "@/hooks/useCloudSync.js";
import IngredientsPanel from "@/components/ingredients/IngredientsPanel.jsx";
import MealsPanel from "@/components/meals/MealsPanel.jsx";
import PlanPanel from "@/components/plan/PlanPanel.jsx";
import ImportExportBar from "@/components/ImportExportBar.jsx";
import AuthNav from "@/components/auth/AuthNav.jsx";
import { toggleGroupButton } from "@/components/ui/inputClasses.js";
import { goalDefaults } from "@/lib/validation.js";

const TABS = [
  { id: "ingredients", label: "Ingredients" },
  { id: "meals", label: "Meals" },
  { id: "plan", label: "Plan" },
];

const SIGNED_OUT_STATE = {
  ingredients: [],
  meals: [],
  plan: [],
  goals: { ...goalDefaults },
};

export default function App() {
  const { state, actions } = useMealBuilder();
  const [activeTab, setActiveTab] = useState("ingredients");
  const session = useServerSession();
  const router = useRouter();

  // Cloud sync loads the account's saved plan and pushes local changes.
  const { syncError } = useCloudSync({
    active: session.status === "signedIn",
    user: session.user,
    state,
    actions,
    onUnauthorized: () => router.replace("/login"),
  });

  // Unauthenticated visitors should be on the login page (the proxy usually
  // catches a missing cookie before load, but sessions can expire mid-use).
  useEffect(() => {
    if (session.status === "signedOut") router.replace("/login");
  }, [session.status, router]);

  // Roving focus: the active tab is the only tabbable one; arrows move both.
  const tabRefs = useRef({});

  function handleTabKeys(event) {
    const index = TABS.findIndex((tab) => tab.id === activeTab);
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    setActiveTab(TABS[next].id);
    tabRefs.current[TABS[next].id]?.focus();
  }

  function handleSignOut() {
    session.signOut();
    // Leave no trace of the previous account on this device.
    actions.replaceAll(SIGNED_OUT_STATE);
    router.replace("/login");
  }

  if (session.status !== "signedIn") {
    // Keep the loading splash while the session resolves or redirects.
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">
          <span aria-hidden="true">🍽️</span> Loading…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-2xl leading-tight sm:text-3xl">
              <span className="text-emerald-600">Macro</span>
              <span className="font-extrabold text-gray-900">Maxxing</span>
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">Stack your plate. Max your macros.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ImportExportBar state={state} actions={actions} />
            <AuthNav user={session.user} signOut={handleSignOut} />
          </div>
        </div>
        {syncError && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {syncError}
            </p>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div
          role="tablist"
          aria-label="MacroMaxxing sections"
          onKeyDown={handleTabKeys}
          className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={toggleGroupButton(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
          {activeTab === "ingredients" && (
            <IngredientsPanel
              ingredients={state.ingredients}
              meals={state.meals}
              plan={state.plan}
              actions={actions}
            />
          )}
          {activeTab === "meals" && (
            <MealsPanel
              ingredients={state.ingredients}
              meals={state.meals}
              plan={state.plan}
              actions={actions}
              onGoToTab={setActiveTab}
            />
          )}
          {activeTab === "plan" && (
            <PlanPanel
              ingredients={state.ingredients}
              meals={state.meals}
              plan={state.plan}
              goals={state.goals}
              actions={actions}
              onGoToTab={setActiveTab}
            />
          )}
        </div>
      </main>
    </div>
  );
}

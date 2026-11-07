"use client";

// Shared email+password form for /login and /register. Plain controlled
// inputs (no TextInput/NumberInput semantics — those commit-on-keystroke
// rules exist for plan data, not credentials).
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  card,
  primaryButton,
  secondaryButton,
  FIELD_ERROR_TEXT,
  FIELD_LABEL,
} from "@/components/ui/inputClasses.js";
import { MIN_PASSWORD_LENGTH } from "@/lib/shared/password.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export default function AuthForm({ mode }) {
  const isRegister = mode === "register";
  const title = isRegister ? "Create your account" : "Sign in to MacroMaxxing";
  const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
  const switchPrompt = isRegister ? "Already have an account?" : "New here?";
  const switchLabel = isRegister ? "Sign in" : "Create an account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  // Live validation only once the user has typed something — no red noise on
  // a pristine form.
  const localError = localValidationError();
  const clientError = email !== "" || password !== "" ? localError : null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      // Session cookie is set by the response; hand off to the app.
      router.replace("/");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  function localValidationError() {
    const trimmedEmail = email.trim();
    if (trimmedEmail === "" || !EMAIL_PATTERN.test(trimmedEmail)) {
      return "Enter a valid email address.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return null;
  }

  return (
    <section className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className={`${card} w-full max-w-sm p-6`}>
        <p aria-hidden="true" className="text-2xl">
          🍽️
        </p>
        <h1 className="mt-1 text-lg font-bold text-gray-900">{title}</h1>
        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
          <div>
            <label htmlFor="auth-email" className={FIELD_LABEL}>
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="auth-password" className={FIELD_LABEL}>
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </div>
          {(error ?? clientError) && (
            <p role="alert" className={FIELD_ERROR_TEXT}>
              {error ?? clientError}
            </p>
          )}
          <button
            type="submit"
            className={`${primaryButton} w-full`}
            disabled={submitting || localError !== null}
          >
            {isRegister ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          {switchPrompt}{" "}
          <Link href={isRegister ? "/login" : "/register"} className={secondaryButton}>
            {switchLabel}
          </Link>
        </p>
      </div>
    </section>
  );
}

import Link from "next/link";
import AuthForm from "@/components/auth/AuthForm.jsx";
import { registrationDisabled } from "@/lib/server/config.js";
import { card, secondaryButton } from "@/components/ui/inputClasses.js";

export const metadata = {
  title: "Create account — MacroMaxxing",
};

export default function RegisterPage() {
  if (registrationDisabled()) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className={`${card} w-full max-w-sm p-6`}>
          <p aria-hidden="true" className="text-2xl">
            🍽️
          </p>
          <h1 className="mt-1 text-lg font-bold text-gray-900">
            Registration is disabled
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            This instance is not accepting new users right now. If you already
            have an account, you can continue signing in below.
          </p>
          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href="/login" className={secondaryButton}>
              Sign in
            </Link>
          </p>
        </div>
      </section>
    );
  }
  return <AuthForm mode="register" />;
}

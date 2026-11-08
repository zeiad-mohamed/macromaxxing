import AuthForm from "@/components/auth/AuthForm.jsx";
import { registrationDisabled } from "@/lib/server/config.js";

export const metadata = {
  title: "Sign in — MacroMaxxing",
};

export default function LoginPage() {
  return <AuthForm mode="login" switchLink={!registrationDisabled()} />;
}

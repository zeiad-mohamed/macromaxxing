import AuthForm from "@/components/auth/AuthForm.jsx";

export const metadata = {
  title: "Sign in — MacroMaxxing",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}

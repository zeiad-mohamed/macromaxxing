import { secondaryButton } from "@/components/ui/inputClasses.js";

// Signed-in identity in the header: the account email plus sign out.
export default function AuthNav({ user, signOut }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-gray-600 sm:inline" title={user.email}>
        {user.email}
      </span>
      <button type="button" className={secondaryButton} onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}

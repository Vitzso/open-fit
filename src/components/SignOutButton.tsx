"use client";

import { LogOut } from "lucide-react";
import { btnSecondary } from "@/lib/ui";
import { signOut } from "@/services/auth.service";

/** Ends this device's session and returns to the lock screen. */
export default function SignOutButton() {
  return (
    <button
      type="button"
      className={btnSecondary}
      onClick={async () => {
        await signOut();
        window.location.href = "/login";
      }}
    >
      <LogOut size={16} /> Sign out
    </button>
  );
}

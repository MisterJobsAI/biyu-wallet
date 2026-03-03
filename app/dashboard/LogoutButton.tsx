"use client";

import { createBrowserClient } from "@supabase/ssr";

export default function LogoutButton() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
    >
      Logout
    </button>
  );
}
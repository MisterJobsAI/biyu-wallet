"use client";

import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    // Normalmente no llegas aquí porque redirige a Google,
    // pero lo dejo para debug.
    console.log("OAuth start:", data);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Login</h1>
      <button onClick={handleGoogleLogin}>Continuar con Google</button>
    </main>
  );
}
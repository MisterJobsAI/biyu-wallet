"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Procesando login...");

  useEffect(() => {
    const run = async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Intercambia code->session en el browser (aquí sí existe el PKCE verifier)
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        setMsg(`Error: ${error.message}`);
        // fallback a login para reintentar
        setTimeout(() => router.replace("/login?error=exchange_failed"), 600);
        return;
      }

      router.replace("/dashboard");
    };

    run();
  }, [router]);

  return (
    <main style={{ padding: 24, maxWidth: 680, margin: "40px auto", fontFamily: "system-ui" }}>
      <h2>BiYú</h2>
      <p>{msg}</p>
    </main>
  );
}
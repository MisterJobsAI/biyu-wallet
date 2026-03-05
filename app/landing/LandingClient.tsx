"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function LandingClient() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const signIn = async () => {
    setMsg("");

    if (!email) {
      setMsg("Escribe un correo válido.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });

    if (error) setMsg(error.message);
    else setMsg("Revisa tu correo para el Magic Link.");
  };

  const signInGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setMsg(error.message);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 40,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background:
          "linear-gradient(135deg,#2c003e 0%,#1a0030 60%,#120022 100%)",
        color: "white",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 48, marginBottom: 8 }}>BiYú</h1>
        <p style={{ opacity: 0.8, marginBottom: 30 }}>
          Tu dinero claro y bajo control
        </p>

        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            borderRadius: 16,
            padding: 24,
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div style={{ marginBottom: 12, fontWeight: 600 }}>Estado</div>
          <div style={{ opacity: 0.8, marginBottom: 16 }}>No logueado</div>

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.08)",
                color: "white",
                minWidth: 240,
              }}
            />

            <button
              onClick={signIn}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "#a855f7",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Login con Magic Link
            </button>

            <button
              onClick={signInGoogle}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "#7c3aed",
                color: "white",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Continuar con Google
            </button>

            <div style={{ opacity: 0.6 }}>DEPLOY-MARKER-123</div>
          </div>

          {msg ? <p style={{ marginTop: 16, opacity: 0.85 }}>{msg}</p> : null}
        </div>
      </div>
    </main>
  );
}
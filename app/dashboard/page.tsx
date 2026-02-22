"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 Redirigir automáticamente si ya hay sesión
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        router.replace("/dashboard");
      }
    };

    checkSession();
  }, [router]);

  const handleLogin = async () => {
    if (!email) return;

    setLoading(true);

    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setLoading(false);
    alert("Revisa tu correo para el Magic Link 🚀");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-black text-white p-6">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md rounded-2xl p-8 border border-white/10">
        <h1 className="text-3xl font-bold mb-6">BiYú</h1>

        <p className="mb-4 text-sm text-white/70">
          Inicia sesión con Magic Link
        </p>

        <input
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-black/30 border border-white/20 mb-4"
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 transition rounded-lg p-3 font-semibold"
        >
          {loading ? "Enviando..." : "Login con Magic Link"}
        </button>
      </div>
    </main>
  );
}
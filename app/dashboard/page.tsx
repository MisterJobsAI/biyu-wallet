"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  // Si ya hay sesión, mandar al dashboard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) router.replace("/dashboard");
    })();
  }, [router]);

  const sendMagicLink = async () => {
    if (!email) return;
    setSending(true);

    const redirectTo = `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setSending(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("✅ Revisa tu correo y abre el Magic Link");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-6">
        <h1 className="text-3xl font-bold mb-2">BiYú</h1>
        <p className="text-sm text-white/70 mb-6">Inicia sesión con Magic Link</p>

        <div className="space-y-3">
          <input
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-3 outline-none"
            placeholder="tu@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className="w-full rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 transition px-4 py-3 font-semibold disabled:opacity-60"
            disabled={sending}
            onClick={sendMagicLink}
          >
            {sending ? "Enviando..." : "Login con Magic Link"}
          </button>
        </div>
      </div>
    </main>
  );
}
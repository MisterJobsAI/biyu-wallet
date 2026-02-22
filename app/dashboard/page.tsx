"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserEmail(data.user.email ?? "Usuario");
      }
    }
    load();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard v2</h1>
      <p>Bienvenido {userEmail ?? "..."}</p>
    </div>
  );
}
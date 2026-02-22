"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getDashboardSummary } from "@/lib/modules/dashboard/getDashboardSummary";
import type { DashboardSummary } from "@/lib/modules/dashboard/types";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!data?.user) {
          setError("No autenticado");
          return;
        }

        const result = await getDashboardSummary(data.user.id);
        setSummary(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>;
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Dashboard v2</h1>
      <pre>{JSON.stringify(summary, null, 2)}</pre>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getDashboardSummary } from "@/lib/modules/dashboard/getDashboardSummary";
import type { DashboardSummary } from "@/lib/modules/dashboard/types";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const displayBalance = useMemo(() => formatMoney(summary?.totalBalance ?? 0), [summary]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const user = data?.user;
        if (!user) {
          setError("No autenticado");
          return;
        }

        if (!mounted) return;
        setUserEmail(user.email ?? "Usuario");

        const s = await getDashboardSummary(user.id);
        if (!mounted) return;
        setSummary(s);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Error cargando dashboard");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Hola 👋</h1>
        <p className="text-purple-300 text-sm">{userEmail ?? "..."}</p>
      </div>

      {loading && <div className="text-purple-200">Cargando datos…</div>}
      {error && <div className="text-red-300">Error: {error}</div>}

      {/* Balance Card */}
      <div className="bg-purple-700 rounded-2xl p-6 shadow-lg mb-4">
        <p className="text-sm text-purple-200">Saldo disponible</p>
        <h2 className="text-3xl font-bold mt-2">{displayBalance}</h2>

        {summary && (
          <p className="text-xs text-purple-200 mt-2">
            Mes: +{formatMoney(summary.monthlyIncome)} / -{formatMoney(summary.monthlyExpense)} · Neto{" "}
            {formatMoney(summary.monthlyNet)}
          </p>
        )}
      </div>

      {/* Quick Actions (solo UI por ahora) */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <button className="bg-purple-800 rounded-xl p-4 text-sm">Enviar</button>
        <button className="bg-purple-800 rounded-xl p-4 text-sm">Recibir</button>
        <button className="bg-purple-800 rounded-xl p-4 text-sm">Tarjeta</button>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Movimientos recientes</h3>

        {(summary?.recentTransactions ?? []).length === 0 && !loading ? (
          <div className="text-purple-200 text-sm">Aún no tienes movimientos.</div>
        ) : (
          (summary?.recentTransactions ?? []).map((t) => {
            const isExpense = t.type === "expense";
            const amount = Number(t.amount ?? 0);
            return (
              <div
                key={t.id}
                className="bg-purple-800 rounded-xl p-4 mb-3 flex justify-between items-center"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {t.description ?? (isExpense ? "Gasto" : "Ingreso")}
                  </span>
                  <span className="text-xs text-purple-300">
                    {new Date(t.created_at).toLocaleString("es-CO")}
                  </span>
                </div>
                <span className={isExpense ? "text-red-300" : "text-green-300"}>
                  {isExpense ? "-" : "+"} {formatMoney(amount)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
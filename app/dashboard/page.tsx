"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getDashboardSummary } from "@/lib/modules/dashboard/getDashboardSummary";
import type { DashboardSummary } from "@/lib/modules/dashboard/types";
import { DashboardCharts } from "./DashboardCharts";

function formatMoneyCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n ?? 0));
}

export default function DashboardPage() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [dashboardSummary, setDashboardSummary] =
    useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const displayBalance = useMemo(() => {
    return formatMoneyCOP(dashboardSummary?.totalBalance ?? 0);
  }, [dashboardSummary]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        // 🔐 Verificar sesión
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!user) {
          router.replace("/");
          return;
        }

        if (!mounted) return;
        setUserEmail(user.email ?? "Usuario");

        // 📊 Cargar resumen
        const summary = await getDashboardSummary(user.id);

        if (!mounted) return;
        setDashboardSummary(summary);
      } catch (e: any) {
        // 🚫 No mostramos error técnico de auth
        const msg = e?.message ?? "";
        if (msg.toLowerCase().includes("auth session missing")) {
          router.replace("/");
          return;
        }

        console.error("Dashboard error:", e);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hola 👋</h1>
          <p className="text-purple-300 text-sm">{userEmail ?? "..."}</p>
        </div>

        <button
          className="bg-purple-800 rounded-xl px-4 py-2 text-sm"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/");
          }}
        >
          Cerrar sesión
        </button>
      </div>

      {loading && (
        <div className="text-purple-200 mb-4">Cargando datos…</div>
      )}

      {/* Balance */}
      <div className="bg-purple-700 rounded-2xl p-6 shadow-lg mb-4">
        <p className="text-sm text-purple-200">Saldo disponible</p>
        <h2 className="text-3xl font-bold mt-2">{displayBalance}</h2>

        {dashboardSummary && (
          <p className="text-xs text-purple-200 mt-2">
            Mes: +{formatMoneyCOP(dashboardSummary.monthlyIncome)} / -
            {formatMoneyCOP(dashboardSummary.monthlyExpense)} · Neto{" "}
            {formatMoneyCOP(dashboardSummary.monthlyNet)}
          </p>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button className="bg-purple-800 rounded-xl p-4 text-sm">
          Enviar
        </button>
        <button className="bg-purple-800 rounded-xl p-4 text-sm">
          Recibir
        </button>
        <button className="bg-purple-800 rounded-xl p-4 text-sm">
          Tarjeta
        </button>
      </div>

      {/* 📊 Charts + Debug */}
      <div className="mb-8">
        <div className="mb-3 text-xs text-purple-200 bg-purple-900/40 rounded-xl p-3">
          <div><b>Charts debug</b></div>
          <div>dashboardSummary: {dashboardSummary ? "OK" : "NULL"}</div>
          <div>
            trend30Days: {dashboardSummary?.trend30Days?.length ?? 0}
          </div>
          <div>
            categoryBreakdown:{" "}
            {dashboardSummary?.categoryBreakdown?.length ?? 0}
          </div>
        </div>

        {dashboardSummary && (
          <div className="min-h-[520px]">
            <DashboardCharts
              trend30Days={dashboardSummary.trend30Days}
              categoryBreakdown={dashboardSummary.categoryBreakdown.map(
                (c) => ({
                  categoryName: c.categoryName,
                  total: c.total,
                })
              )}
            />
          </div>
        )}
      </div>

      {/* Movimientos recientes */}
      <div>
        <h3 className="text-lg font-semibold mb-4">
          Movimientos recientes
        </h3>

        {(dashboardSummary?.recentTransactions ?? []).length === 0 ? (
          <div className="text-purple-200 text-sm">
            Aún no tienes movimientos.
          </div>
        ) : (
          dashboardSummary?.recentTransactions.map((t) => {
            const isExpense = t.type === "expense";

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
                  {isExpense ? "-" : "+"}{" "}
                  {formatMoneyCOP(Number(t.amount))}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
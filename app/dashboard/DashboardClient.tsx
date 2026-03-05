// app/dashboard/DashboardClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import BalanceCard from "./components/BalanceCard";
import AlertsCard from "./components/AlertsCard";
import AccountsCard from "./components/AccountsCard";
import MonthSummary from "./components/MonthSummary";
import TopCategories from "./components/TopCategories";
import LastMovements from "./components/LastMovements";
import AddEntryForm from "./AddEntryForm";

type Account = { id: string; name: string; balance: number; currency: string };

type Category = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

type Entry = {
  amount: number;
  kind: "INCOME" | "EXPENSE";
  asset?: string | null;
  description?: string | null;
  occurred_at: string;
  account_id: string;
  category_id?: string | null;
};

type Props = {
  accounts: Account[];
  categories: Category[];
  entries: Entry[];

  monthLabel: string; // "YYYY-MM"
  budgetLimitCop: number;
};

export default function DashboardClient({
  accounts,
  categories,
  entries,
  monthLabel,
  budgetLimitCop,
}: Props) {
  const firstId = accounts?.[0]?.id;

  const [activeAccountId, setActiveAccountId] = useState<string | undefined>(
    firstId
  );

  // Load from localStorage once accounts exist
  useEffect(() => {
    const key = "biyu.activeAccountId";
    const saved = window.localStorage.getItem(key);
    if (saved && accounts.some((a) => a.id === saved)) setActiveAccountId(saved);
    else if (!saved && firstId) setActiveAccountId(firstId);
  }, [accounts, firstId]);

  // Persist selection
  useEffect(() => {
    if (!activeAccountId) return;
    window.localStorage.setItem("biyu.activeAccountId", activeAccountId);
  }, [activeAccountId]);

  const activeAccount = useMemo(() => {
    if (!activeAccountId) return accounts?.[0];
    return accounts.find((a) => a.id === activeAccountId) ?? accounts?.[0];
  }, [accounts, activeAccountId]);

  // Filter entries by active account
  const filteredEntries = useMemo(() => {
    if (!activeAccountId) return entries ?? [];
    return (entries ?? []).filter((e) => e.account_id === activeAccountId);
  }, [entries, activeAccountId]);

  // Recompute month stats + top categories for active account
  const recomputed = useMemo(() => {
    const income = (filteredEntries ?? [])
      .filter((e) => e.kind === "INCOME")
      .reduce((s, e) => s + Number(e.amount), 0);

    const expense = (filteredEntries ?? [])
      .filter((e) => e.kind === "EXPENSE")
      .reduce((s, e) => s + Math.abs(Number(e.amount)), 0);

    const catName = new Map<string, string>();
    (categories ?? []).forEach((c) => catName.set(c.id, c.name));

    const byCat = new Map<string, number>();
    for (const e of filteredEntries ?? []) {
      if (e.kind !== "EXPENSE") continue;
      const key = e.category_id ?? "uncat";
      byCat.set(key, (byCat.get(key) ?? 0) + Math.abs(Number(e.amount)));
    }

    const topCats = Array.from(byCat.entries())
      .map(([id, total]) => ({
        id,
        name: id === "uncat" ? "(sin categoría)" : catName.get(id) ?? id,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    return { income, expense, topCats };
  }, [filteredEntries, categories]);

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        {/* Saldo total (por ahora suma todas las cuentas) + presupuesto (filtrado por cuenta activa) */}
        <BalanceCard
          accounts={accounts}
          monthExpenseCop={recomputed.expense}
          budgetLimitCop={budgetLimitCop}
          monthLabel={monthLabel}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <AlertsCard spentCop={recomputed.expense} limitCop={budgetLimitCop} />

          <AccountsCard
            accounts={accounts}
            activeAccountId={activeAccountId}
            onChangeActive={setActiveAccountId}
          />
        </div>

        <MonthSummary
          income={recomputed.income}
          expense={recomputed.expense}
          net={recomputed.income - recomputed.expense}
        />

        <TopCategories topCats={recomputed.topCats as any} />

        {/* AddEntryForm debe aceptar accountId y guardarlo en ledger_entries.account_id */}
        <AddEntryForm
          categories={categories as any}
          accountId={activeAccountId ?? firstId}
        />

        <LastMovements entries={filteredEntries as any} />

        {/* Debug opcional */}
        <div style={{ opacity: 0.6, fontSize: 12 }}>
          Cuenta activa: <strong>{activeAccount?.name ?? "—"}</strong>
        </div>
      </div>
    </main>
  );
}
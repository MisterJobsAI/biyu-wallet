import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import AddEntryForm from "./AddEntryForm";

import HeaderBar from "./components/HeaderBar";
import BalanceCard from "./components/BalanceCard";
import MonthSummary from "./components/MonthSummary";
import TopCategories from "./components/TopCategories";
import LastMovements from "./components/LastMovements";

import AlertsCard from "./components/AlertsCard";
import AccountsCard from "./components/AccountsCard";

import HeaderBar from "./components/HeaderBar";
import BalanceCard from "./components/BalanceCard";
import MonthSummary from "./components/MonthSummary";
import TopCategories from "./components/TopCategories";
import LastMovements from "./components/LastMovements";
import AlertsCard from "./components/AlertsCard";
import AccountsCard from "./components/AccountsCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /*
  ------------------------------------
  BOOTSTRAP ACCOUNT (COP)
  ------------------------------------
  */

  const { data: upsertData, error: accountErr } = await supabase
    .from("accounts")
    .upsert(
      [{ user_id: user.id, name: "Bolsillo principal", currency: "COP", balance: 0 }],
      { onConflict: "user_id,name" }
    )
    .select();

  const { data: accounts, error: accountsErr } = await supabase
    .from("accounts")
    .select("id,user_id,name,balance,currency,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (accountErr || accountsErr || !accounts || accounts.length === 0) {
   return (
  <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
    <HeaderBar email={user.email ?? "no-email"} />

    <div style={{ height: 16 }} />

    <BalanceCard
      accounts={(accounts ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        balance: Number(a.balance ?? 0),
        currency: a.currency,
      }))}
      monthExpenseCop={expense}
      budgetLimitCop={10000}
      monthLabel={month}
    />

    <div style={{ height: 16 }} />

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      }}
    >
      <AlertsCard spentCop={expense} limitCop={10000} />

      <AccountsCard
        accounts={(accounts ?? []).map((a: any) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.balance ?? 0),
          currency: a.currency,
        }))}
      />
    </div>

    <div style={{ height: 16 }} />

    <MonthSummary income={income} expense={expense} net={income - expense} />

    <TopCategories topCats={topCats as any} />

    <AddEntryForm categories={(categories ?? []) as any} />

    <LastMovements entries={(entries ?? []) as any} />
  </main>
);
  }

  const defaultAccountId = accounts[0].id;

  /*
  ------------------------------------
  BOOTSTRAP CATEGORIES
  ------------------------------------
  */

  await supabase.from("categories").upsert(
    [
      { user_id: user.id, name: "Comida", kind: "EXPENSE" },
      { user_id: user.id, name: "Transporte", kind: "EXPENSE" },
      { user_id: user.id, name: "Arriendo", kind: "EXPENSE" },
      { user_id: user.id, name: "Entretenimiento", kind: "EXPENSE" },
      { user_id: user.id, name: "Salario", kind: "INCOME" },
      { user_id: user.id, name: "Otros", kind: "INCOME" },
    ],
    { onConflict: "user_id,name,kind" }
  );

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,kind")
    .eq("user_id", user.id)
    .order("kind")
    .order("name");

  /*
  ------------------------------------
  BOOTSTRAP MONTHLY BUDGET
  ------------------------------------
  */

  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  await supabase.from("monthly_budgets").upsert(
    [{ user_id: user.id, month, limit_cop: 10000 }],
    { onConflict: "user_id,month" }
  );

  /*
  ------------------------------------
  MONTH STATS
  ------------------------------------
  */

  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data: monthEntries } = await supabase
    .from("ledger_entries")
    .select("amount,kind,category_id")
    .eq("user_id", user.id)
    .gte("occurred_at", from)
    .lt("occurred_at", to);

  const income = (monthEntries ?? [])
    .filter((e) => e.kind === "INCOME")
    .reduce((s, e) => s + Number(e.amount), 0);

  const expense = (monthEntries ?? [])
    .filter((e) => e.kind === "EXPENSE")
    .reduce((s, e) => s + Math.abs(Number(e.amount)), 0);

  const catName = new Map<string, string>();
  (categories ?? []).forEach((c) => catName.set(c.id, c.name));

  const byCat = new Map<string, number>();

  for (const e of monthEntries ?? []) {
    if (e.kind !== "EXPENSE") continue;

    const key = e.category_id ?? "uncat";
    byCat.set(key, (byCat.get(key) ?? 0) + Math.abs(Number(e.amount)));
  }

  const topCats = Array.from(byCat.entries())
    .map(([id, total]) => ({
      id,
      name: id === "uncat" ? "(sin categoría)" : (catName.get(id) ?? id),
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  /*
  ------------------------------------
  LAST ENTRIES
  ------------------------------------
  */

  const { data: entries } = await supabase
    .from("ledger_entries")
    .select("amount,kind,asset,description,occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(12);

  /*
  ------------------------------------
  UI
  ------------------------------------
  */

return (
  <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
    <HeaderBar email={user.email ?? "no-email"} />

    <div style={{ height: 16 }} />

    <BalanceCard
      accounts={(accounts ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        balance: Number(a.balance ?? 0),
        currency: a.currency,
      }))}
      monthExpenseCop={expense}
      budgetLimitCop={10000}
      monthLabel={month}
    />

    <div style={{ height: 16 }} />

    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
      }}
    >
      <AlertsCard spentCop={expense} limitCop={10000} />

      <AccountsCard
        accounts={(accounts ?? []).map((a: any) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.balance ?? 0),
          currency: a.currency,
        }))}
      />
    </div>

    <div style={{ height: 16 }} />

    <MonthSummary income={income} expense={expense} net={income - expense} />

    <TopCategories topCats={topCats as any} />

    <AddEntryForm categories={(categories ?? []) as any} />

    <LastMovements entries={(entries ?? []) as any} />
  </main>
);
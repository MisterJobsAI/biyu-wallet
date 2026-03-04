import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import AddEntryForm from "./AddEntryForm";

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
      <main style={{ padding: 24 }}>
        <h1>Dashboard</h1>

        <p><b>User:</b> {user.email}</p>
        <p><b>User ID:</b> {user.id}</p>

        <h3>Diagnóstico accounts</h3>

        <p><b>Upsert error</b></p>
        <pre>{JSON.stringify(accountErr, null, 2)}</pre>

        <p><b>Select error</b></p>
        <pre>{JSON.stringify(accountsErr, null, 2)}</pre>

        <p><b>Upsert data</b></p>
        <pre>{JSON.stringify(upsertData, null, 2)}</pre>

        <p><b>Accounts length:</b> {accounts?.length ?? 0}</p>
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
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>

      <p><b>User:</b> {user.email}</p>

      <h2>Balances</h2>
      <ul>
        {(accounts ?? []).map((a) => (
          <li key={a.id}>
            {a.name} — {a.balance} {a.currency}
          </li>
        ))}
      </ul>

      <h2>Este mes</h2>

      <p><b>Ingresos:</b> {income}</p>
      <p><b>Gastos:</b> {expense}</p>
      <p><b>Neto:</b> {income - expense}</p>

      <h3>Top categorías (gasto)</h3>

      <ul>
        {topCats.length
          ? topCats.map((c) => (
              <li key={c.id}>
                {c.name}: {c.total}
              </li>
            ))
          : <li>(sin datos aún)</li>}
      </ul>

      <AddEntryForm categories={(categories ?? []) as any} />

      <h2>Últimos movimientos</h2>

      <ul>
        {(entries ?? []).map((e, i) => (
          <li key={i}>
            {new Date(e.occurred_at).toLocaleString()} — {e.kind} {e.amount} {e.asset}
            {e.description ? ` — ${e.description}` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
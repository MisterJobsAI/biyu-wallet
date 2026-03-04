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

  // Ensure wallet accounts exist
  await supabase.from("wallet_accounts").upsert(
    [
      { user_id: user.id, asset: "USDC" },
      { user_id: user.id, asset: "EUROC" },
    ],
    { onConflict: "user_id,asset" }
  );

  // Default categories (MVP)
  await supabase.from("categories").upsert(
    [
      { user_id: user.id, name: "Food", kind: "EXPENSE" },
      { user_id: user.id, name: "Transport", kind: "EXPENSE" },
      { user_id: user.id, name: "Rent", kind: "EXPENSE" },
      { user_id: user.id, name: "Entertainment", kind: "EXPENSE" },
      { user_id: user.id, name: "Salary", kind: "INCOME" },
      { user_id: user.id, name: "Other", kind: "INCOME" },
    ],
    { onConflict: "user_id,name,kind" }
  );

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,kind")
    .eq("user_id", user.id)
    .order("kind")
    .order("name");

  const { data: accounts } = await supabase
    .from("wallet_accounts")
    .select("asset,balance")
    .eq("user_id", user.id)
    .order("asset");

  // Month range
  const now = new Date();
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

  const { data: entries } = await supabase
    .from("ledger_entries")
    .select("amount,kind,asset,description,occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(12);

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p><b>User:</b> {user.email}</p>

      <h2>Balances</h2>
      <ul>
        {(accounts ?? []).map((a) => (
          <li key={a.asset}>
            {a.asset}: {String(a.balance)}
          </li>
        ))}
      </ul>

      <h2>Este mes</h2>
      <p><b>Ingresos:</b> {income}</p>
      <p><b>Gastos:</b> {expense}</p>
      <p><b>Neto:</b> {income - expense}</p>

      <h3>Top categorías (gasto)</h3>
      <ul>
        {topCats.length ? topCats.map((c) => (
          <li key={c.id}>
            {c.name}: {c.total}
          </li>
        )) : <li>(sin datos aún)</li>}
      </ul>

      <AddEntryForm categories={(categories ?? []) as any} />

      <h2>Últimos movimientos</h2>
      <ul>
        {(entries ?? []).map((e, i) => (
          <li key={i}>
            {new Date(e.occurred_at).toLocaleString()} — {e.kind} {String(e.amount)} {e.asset}
            {e.description ? ` — ${e.description}` : ""}
          </li>
        ))}
      </ul>
    </main>
  );
}
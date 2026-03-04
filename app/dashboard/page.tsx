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
        setAll() {}, // dashboard SSR solo lee
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ✅ Bootstrap COP básico (sin depender de wallet crypto)
  await supabase.from("accounts").upsert(
    [{ user_id: user.id, name: "Bolsillo principal", kind: "MAIN", currency: "COP" }],
    { onConflict: "user_id,name" }
  );

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

  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  await supabase.from("monthly_budgets").upsert(
    [{ user_id: user.id, month, limit_cop: 10000 }],
    { onConflict: "user_id,month" }
  );

  // ✅ Cargar bolsillos
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id,name,kind,currency")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const defaultAccountId = accounts?.[0]?.id ?? "";
  if (!defaultAccountId) {
    // Si esto pasa, el upsert falló por RLS/config
    return (
      <main style={{ padding: 24 }}>
        <h1>Dashboard</h1>
        <p>No se pudo crear/cargar el bolsillo principal. Revisa RLS/policies en `accounts`.</p>
      </main>
    );
  }

  // ✅ Cargar categorías
  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,kind")
    .eq("user_id", user.id)
    .order("kind")
    .order("name");

  // ✅ Presupuesto del mes
  const { data: budgetRow } = await supabase
    .from("monthly_budgets")
    .select("limit_cop")
    .eq("user_id", user.id)
    .eq("month", month)
    .maybeSingle();

  const budgetLimit = Number(budgetRow?.limit_cop ?? 0);

  // ✅ Rango del mes
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  // ✅ Transacciones del mes (COP)
  const { data: monthTx } = await supabase
    .from("transactions")
    .select("amount_cop,kind,category_id")
    .eq("user_id", user.id)
    .gte("occurred_at", from)
    .lt("occurred_at", to);

  const income = (monthTx ?? [])
    .filter((t) => t.kind === "INCOME")
    .reduce((s, t) => s + Number(t.amount_cop), 0);

  const expense = (monthTx ?? [])
    .filter((t) => t.kind === "EXPENSE")
    .reduce((s, t) => s + Number(t.amount_cop), 0);

  const net = income - expense;
  const available = Math.max(budgetLimit - expense, 0);
  const progress = budgetLimit > 0 ? expense / budgetLimit : 0;

  // Top categorías (gasto)
  const catName = new Map<string, string>();
  (categories ?? []).forEach((c) => catName.set(c.id, c.name));

  const byCat = new Map<string, number>();
  for (const t of monthTx ?? []) {
    if (t.kind !== "EXPENSE") continue;
    const key = t.category_id ?? "uncat";
    byCat.set(key, (byCat.get(key) ?? 0) + Number(t.amount_cop));
  }

  const topCats = Array.from(byCat.entries())
    .map(([id, total]) => ({
      id,
      name: id === "uncat" ? "(sin categoría)" : (catName.get(id) ?? id),
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Últimos movimientos
  const { data: entries } = await supabase
    .from("transactions")
    .select("kind,amount_cop,note,occurred_at")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(12);

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p><b>User:</b> {user.email}</p>

      <h2>Presupuesto del mes</h2>
      <p><b>Límite:</b> {budgetLimit} COP</p>
      <p><b>Gastado:</b> {expense} COP</p>
      <p><b>Disponible:</b> {available} COP</p>
      <p><b>Progreso:</b> {Math.round(progress * 100)}%</p>

      {budgetLimit > 0 && progress >= 1 && (
        <p style={{ color: "salmon" }}>
          🚨 Excediste el límite total del mes: {expense} / {budgetLimit} COP
        </p>
      )}
      {budgetLimit > 0 && progress >= 0.8 && progress < 1 && (
        <p style={{ color: "khaki" }}>
          ⚠️ Vas en {Math.round(progress * 100)}% del presupuesto.
        </p>
      )}

      <h3>Top categorías (gasto)</h3>
      <ul>
        {topCats.length ? topCats.map((c) => (
          <li key={c.id}>
            {c.name}: {c.total} COP
          </li>
        )) : <li>(sin datos aún)</li>}
      </ul>

      <AddEntryForm
        categories={(categories ?? []) as any}
        accounts={(accounts ?? []).map((a) => ({ id: a.id, name: a.name })) as any}
        defaultAccountId={defaultAccountId}
      />

      <h2>Últimos movimientos</h2>
      <ul>
        {(entries ?? []).map((e, i) => (
          <li key={i}>
            {new Date(e.occurred_at).toLocaleString()} — {e.kind} {String(e.amount_cop)} COP
            {e.note ? ` — ${e.note}` : ""}
          </li>
        ))}
      </ul>

      <h2>Este mes</h2>
      <p><b>Ingresos:</b> {income} COP</p>
      <p><b>Gastos:</b> {expense} COP</p>
      <p><b>Neto:</b> {net} COP</p>
    </main>
  );
}
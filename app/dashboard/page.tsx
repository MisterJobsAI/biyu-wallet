// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import DashboardClient from "./DashboardClient";
import HeaderBar from "./components/HeaderBar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies(); // ✅ Next 16: cookies() es async en tu setup

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // no-op en Server Component
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /*
  ------------------------------------
  BOOTSTRAP ACCOUNT (COP)
  ------------------------------------
  */

  const { error: accountErr } = await supabase
    .from("accounts")
    .upsert(
      [
        {
          user_id: user.id,
          name: "Bolsillo principal",
          currency: "COP",
          balance: 0,
        },
      ],
      { onConflict: "user_id,name" }
    );

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
        <div
          style={{
            borderRadius: 16,
            padding: 16,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>
            No pudimos cargar tus cuentas
          </div>
          <div style={{ opacity: 0.85, fontSize: 14 }}>
            Intenta recargar. Si persiste, revisa conexión con Supabase o RLS.
          </div>
        </div>
      </main>
    );
  }

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

  console.log("CATEGORIES SERVER:", categories);
    /*
  ------------------------------------
  BOOTSTRAP MONTHLY BUDGET (por ahora fijo a 10000)
  ------------------------------------
  */

  const now = new Date();
  const monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const month = monthDate.toISOString().slice(0, 10); // YYYY-MM-01

  await supabase
    .from("monthly_budgets")
    .upsert([{ user_id: user.id, month, limit_cop: 10000 }], {
      onConflict: "user_id,month",
    });

  const budgetLimitCop = 10000; // luego lo leemos real desde monthly_budgets

  /*
  ------------------------------------
  LAST ENTRIES (incluye account_id)
  ------------------------------------
  */

  const { data: entries } = await supabase
    .from("ledger_entries")
    .select("amount,kind,asset,description,occurred_at,account_id,category_id")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(200);

  /*
  ------------------------------------
  UI (Client)
  ------------------------------------
  */

  return (
    <>
      {/* HeaderBar en server para mostrar email incluso si el client tarda */}
      <HeaderBar email={user.email ?? "no-email"} />

      <DashboardClient
        accounts={(accounts ?? []).map((a: any) => ({
          id: a.id,
          name: a.name,
          balance: Number(a.balance ?? 0),
          currency: a.currency,
        }))}
        categories={(categories ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          kind: c.kind,
        }))}
        entries={(entries ?? []).map((e: any) => ({
          amount: Number(e.amount),
          kind: e.kind,
          asset: e.asset,
          description: e.description,
          occurred_at: e.occurred_at,
          account_id: e.account_id,
          category_id: e.category_id,
        }))}
        monthLabel={new Date().toISOString().slice(0, 7)} // YYYY-MM
        budgetLimitCop={budgetLimitCop}
      />
    </>
  );
}
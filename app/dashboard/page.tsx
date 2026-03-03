import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

  // ✅ Verificar sesión
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // ✅ Crear cuentas si no existen
  await supabase
    .from("wallet_accounts")
    .upsert(
      [
        { user_id: user.id, asset: "USDC" },
        { user_id: user.id, asset: "EUROC" },
      ],
      { onConflict: "user_id,asset" }
    );

  // ✅ Leer balances
  const { data: accounts, error: accountsError } = await supabase
    .from("wallet_accounts")
    .select("asset,balance")
    .eq("user_id", user.id)
    .order("asset");

  // ✅ Leer movimientos
  const { data: entries, error: entriesError } = await supabase
    .from("ledger_entries")
    .select("asset,amount,type,reference,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main style={{ padding: 24 }}>

      <h1>Dashboard</h1>

      <p><b>User:</b> {user.email}</p>

      {/* BALANCES */}
      <h2>Balances</h2>

      {accountsError ? (
        <p>❌ {accountsError.message}</p>
      ) : (
        <ul>
          {(accounts ?? []).map((a) => (
            <li key={a.asset}>
              {a.asset}: {String(a.balance)}
            </li>
          ))}
        </ul>
      )}

      {/* MOVIMIENTOS */}
      <h2>Últimos movimientos</h2>

      {entriesError ? (
        <p>❌ {entriesError.message}</p>
      ) : (
        <ul>
          {(entries ?? []).map((e, i) => (
            <li key={i}>
              {e.type} {String(e.amount)} {e.asset}
            </li>
          ))}
        </ul>
      )}

    </main>
  );
}
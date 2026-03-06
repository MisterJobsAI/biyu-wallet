import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  // ✅ cuenta activa obligatoria (para tu filtro B)
  const account_id =
    typeof body.account_id === "string" ? body.account_id : null;

  if (!account_id) {
    return NextResponse.json({ error: "missing_account_id" }, { status: 400 });
  }

  // ✅ valida que esa cuenta sea del usuario (evita abuso / RLS issues)
  const { data: acc, error: accErr } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", account_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accErr || !acc) {
    return NextResponse.json({ error: "invalid_account_id" }, { status: 400 });
  }

  const kind = body.kind === "INCOME" ? "INCOME" : "EXPENSE";

  const amountRaw = Number(body.amount ?? 0);
  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const amount = kind === "EXPENSE" ? -Math.abs(amountRaw) : Math.abs(amountRaw);

  // ✅ tu UI manda COP, así que respetamos COP
  const asset = "COP";
  body.asset === "COP"
    ? "COP"
    : body.asset === "EUROC"
    ? "EUROC"
    : "USDC";

  const category_id =
    typeof body.category_id === "string" ? body.category_id : null;

  const description =
    typeof body.description === "string"
      ? body.description.slice(0, 200)
      : null;

  const { error } = await supabase.from("ledger_entries").insert({
    user_id: user.id,
    account_id, // ✅ CLAVE
    asset,
    amount,
    type: kind === "INCOME" ? "DEPOSIT" : "WITHDRAW",
    kind,
    category_id,
    description,
    occurred_at: new Date().toISOString(),
    reference: "MVP",
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // ✅ si tu RPC está diseñada para balance por usuario+asset, se mantiene
  const { error: rpcErr } = await supabase.rpc("wallet_apply_ledger", {
    p_user_id: user.id,
    p_asset: asset,
    p_amount: amount,
  });

  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 400 });
  }

  return response;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Use POST to create a ledger entry",
  });
}
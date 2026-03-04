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

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));

  const kind = body.kind === "INCOME" ? "INCOME" : "EXPENSE";

  const amountRaw = Number(body.amount ?? 0);

  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return NextResponse.json(
      { error: "invalid_amount" },
      { status: 400 }
    );
  }

  const amount =
    kind === "EXPENSE"
      ? -Math.abs(amountRaw)
      : Math.abs(amountRaw);

  const asset =
    body.asset === "EUROC"
      ? "EUROC"
      : "USDC";

  const category_id =
    typeof body.category_id === "string"
      ? body.category_id
      : null;

  const description =
    typeof body.description === "string"
      ? body.description.slice(0, 200)
      : null;

  const { error } = await supabase
    .from("ledger_entries")
    .insert({
      user_id: user.id,
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
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
  await supabase.rpc("wallet_apply_ledger", {
  p_user_id: user.id,
  p_asset: asset,
  p_amount: amount
});

  return NextResponse.json({ ok: true });
}


export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Use POST to create a ledger entry"
  });
}
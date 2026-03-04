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
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const kind = body.kind === "INCOME" ? "INCOME" : "EXPENSE";
  const amount = Number(body.amount_cop ?? body.amount ?? 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const account_id = typeof body.account_id === "string" ? body.account_id : null;
  if (!account_id) return NextResponse.json({ error: "missing_account_id" }, { status: 400 });

  const category_id = typeof body.category_id === "string" ? body.category_id : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 200) : null;

  const occurred_at =
    typeof body.occurred_at === "string"
      ? body.occurred_at
      : new Date().toISOString();

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id,
    kind,
    amount_cop: Math.trunc(amount),
    category_id,
    note,
    occurred_at,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST to create a transaction" });
}
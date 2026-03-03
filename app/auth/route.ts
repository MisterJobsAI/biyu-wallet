// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/app"; // <- cambia si tu home post-login es otra

  // Si llega error desde el proveedor (Google)
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  if (error) {
    const errUrl = new URL("/", url.origin);
    errUrl.searchParams.set("authError", error);
    if (errorDescription) errUrl.searchParams.set("authErrorDesc", errorDescription);
    return NextResponse.redirect(errUrl);
  }

  if (!code) {
    // Sin code => no hay nada que intercambiar, vuelve a landing con señal clara
    const errUrl = new URL("/", url.origin);
    errUrl.searchParams.set("authError", "missing_code");
    return NextResponse.redirect(errUrl);
  }

  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    // Si falla el exchange, normalmente es config (redirects) o flujo iniciado mal (server-side)
    const errUrl = new URL("/", url.origin);
    errUrl.searchParams.set("authError", "exchange_failed");
    errUrl.searchParams.set("message", exchangeError.message);
    return NextResponse.redirect(errUrl);
  }

  // Éxito: ya quedó la sesión en cookies
  return NextResponse.redirect(new URL(next, url.origin));
}
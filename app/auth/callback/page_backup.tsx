'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // 1) Si viene ?code=..., intercámbialo por sesión (esto es CLAVE)
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('exchangeCodeForSession error:', error);
            router.replace('/?e=oauth_exchange_failed');
            return;
          }
        }

        // 2) Ya con el exchange hecho, lee sesión
        const { data } = await supabase.auth.getSession();

        // 3) Limpia URL (opcional)
        try {
          window.history.replaceState({}, document.title, '/auth/callback');
        } catch {}

        if (data.session?.user) router.replace('/dashboard');
        else router.replace('/?e=no_session_after_callback');
      } catch (e) {
        console.error('callback unexpected error:', e);
        router.replace('/?e=callback_exception');
      }
    })();
  }, [router]);

  return <div style={{ padding: 24 }}>Procesando login…</div>;
}
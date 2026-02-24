'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // deja que supabase-js procese el callback
      await new Promise((r) => setTimeout(r, 80));

      const { data } = await supabase.auth.getSession();

      // limpia la URL (opcional)
      try {
        window.history.replaceState({}, document.title, '/auth/callback');
      } catch {}

      if (data.session?.user) router.replace('/dashboard');
      else router.replace('/');
    })();
  }, [router]);

  return <div style={{ padding: 24 }}>Procesando login…</div>;
}
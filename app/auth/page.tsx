'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Si ya hay sesión, ir directo al dashboard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) router.replace('/dashboard');
    })();
  }, [router]);

  const redirectTo = () => new URL('/auth/callback', window.location.origin).toString();

  // MAGIC LINK
  const loginWithMagicLink = async () => {
    setLoading(true);
    setErrorMsg('');
    setMessage('');

    const redirect = redirectTo();
    console.log('emailRedirectTo=', JSON.stringify(redirect));

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect },
    });

    setLoading(false);

    if (error) setErrorMsg(error.message);
    else setMessage('Revisa tu correo para iniciar sesión (usa el correo más reciente).');
  };

  // GOOGLE
  const loginWithGoogle = async () => {
    setLoading(true);
    setErrorMsg('');

    const redirect = redirectTo();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirect },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <div style={{ width: 420, padding: 28, borderRadius: 16, background: 'rgba(255,255,255,0.06)' }}>
        <h1 style={{ marginTop: 0 }}>BiYú</h1>
        <div style={{ opacity: 0.8, marginBottom: 14 }}>Tu dinero claro y bajo control</div>

        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            value={email}
            placeholder="tu@email.com"
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: 1, height: 42, borderRadius: 10, padding: '0 12px' }}
          />
          <button
            onClick={loginWithMagicLink}
            disabled={loading || !email}
            style={{ height: 42, borderRadius: 10, padding: '0 14px', fontWeight: 700 }}
          >
            {loading ? 'Enviando…' : 'Login con Magic Link'}
          </button>
        </div>

        <div style={{ margin: '14px 0', opacity: 0.6, textAlign: 'center' }}>o</div>

        <button
          onClick={loginWithGoogle}
          disabled={loading}
          style={{ width: '100%', height: 44, borderRadius: 10, fontWeight: 800 }}
        >
          Continuar con Google
        </button>

        {message && <div style={{ marginTop: 14 }}>{message}</div>}
        {errorMsg && <div style={{ marginTop: 14, color: '#ff6b6b' }}>{errorMsg}</div>}
      </div>
    </div>
  );
}
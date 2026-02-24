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
      if (data.session?.user) {
        router.replace('/dashboard');
      }
    })();
  }, [router]);

  // MAGIC LINK
  const loginWithMagicLink = async () => {
    setLoading(true);
    setErrorMsg('');
    setMessage('');

    const redirect = new URL('/auth/callback', window.location.origin).toString();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirect,
      },
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setMessage('Revisa tu correo para iniciar sesión.');
    }
  };

  // GOOGLE LOGIN
  const loginWithGoogle = async () => {
    setLoading(true);
    setErrorMsg('');

    const redirect = new URL('/auth/callback', window.location.origin).toString();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirect,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#0f172a',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 380,
          padding: 32,
          borderRadius: 16,
          background: '#1e293b',
          color: 'white',
        }}
      >
        <h2 style={{ marginTop: 0 }}>BiYú</h2>

        <div style={{ marginBottom: 12 }}>
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              height: 44,
              padding: 10,
              borderRadius: 8,
              border: 'none',
            }}
          />
        </div>

        <button
          onClick={loginWithMagicLink}
          disabled={loading || !email}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            fontWeight: 700,
            marginBottom: 10,
            background: '#2563eb',
            color: 'white',
            border: 'none',
          }}
        >
          {loading ? 'Enviando…' : 'Entrar con Magic Link'}
        </button>

        <div style={{ textAlign: 'center', margin: '12px 0', opacity: 0.6 }}>
          o
        </div>

        <button
          onClick={loginWithGoogle}
          disabled={loading}
          style={{
            width: '100%',
            height: 44,
            borderRadius: 10,
            fontWeight: 700,
            background: '#fff',
            color: '#000',
            border: 'none',
          }}
        >
          Continuar con Google
        </button>

        {message && (
          <div style={{ marginTop: 16, color: '#22c55e' }}>
            {message}
          </div>
        )}

        {errorMsg && (
          <div style={{ marginTop: 16, color: '#ef4444' }}>
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
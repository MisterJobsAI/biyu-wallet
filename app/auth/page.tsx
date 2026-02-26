'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ✅ Si vienes de Google con #access_token, esto crea sesión y redirige
  useEffect(() => {
    let alive = true

    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!alive) return

        if (data.session) {
          // limpia el hash (#access_token...) para que no quede en la barra
          if (window.location.hash) {
            window.history.replaceState({}, document.title, window.location.pathname)
          }
          router.replace('/dashboard')
        }
      } catch (e) {
        // no hacemos nada: en login puede no haber sesión
      }
    }

    run()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace('/dashboard')
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [router])

  const handleGoogle = async () => {
    try {
      setErrorMsg(null)
      setLoading(true)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // como tu flujo está volviendo a /auth con hash, lo aprovechamos
          redirectTo: `${window.location.origin}/auth`,
        },
      })

      if (error) throw error
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'Error iniciando Google OAuth')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 rounded-xl">
        <h1 className="text-3xl font-bold mb-4">BiYú</h1>

        {errorMsg && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold"
        >
          {loading ? 'Procesando login…' : 'Continuar con Google'}
        </button>
      </div>
    </div>
  )
}
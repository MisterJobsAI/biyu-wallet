'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  
  useEffect(() => {
  console.log("AUTH EFFECT RUNNING")

  let alive = true

  const run = async () => {
    try {
      const { data, error } = await supabase.auth.getSession()

      console.log("SESSION RESPONSE:", data)
      console.log("SESSION ERROR:", error)

      if (!alive) return

      if (data?.session) {
        console.log("SESSION FOUND")

        // Limpia el hash (#access_token=...)
        if (window.location.hash) {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          )
        }

        router.replace('/dashboard')
      }
    } catch (err) {
      console.error("SESSION CHECK FAILED:", err)
    }
  }

  run()

  return () => {
    alive = false
  }
}, [router])

  useEffect(() => {
  let alive = true

  const run = async () => {
    try {
      // 1️⃣ Si volvemos con #access_token=...
      const hash = window.location.hash

      if (hash && hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.replace('#', ''))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })

          if (error) {
            console.error('setSession error:', error)
          } else {
            // limpiar hash
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            )
          }
        }
      }

      // 2️⃣ Ahora sí pedimos la sesión
      const { data } = await supabase.auth.getSession()

      if (!alive) return

      if (data.session) {
        router.replace('/dashboard')
      }
    } catch (err) {
      console.error('Auth processing error:', err)
    }
  }

  run()

  return () => {
    alive = false
  }
}, [router])

    run()

    return () => {
      alive = false
    }
  }, [router])

  const handleGoogle = async () => {
    try {
      setErrorMsg(null)
      setLoading(true)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      })

      if (error) throw error
    } catch (e: any) {
      console.error('GOOGLE LOGIN ERROR:', e)
      setErrorMsg(e?.message ?? 'Error iniciando Google OAuth')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 rounded-xl">
        <h1 className="text-3xl font-bold mb-6">BiYú</h1>

        {errorMsg && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-3 rounded-lg font-semibold bg-purple-600 text-white"
        >
          {loading ? 'Procesando login…' : 'Continuar con Google'}
        </button>
      </div>
    </div>
  )
}
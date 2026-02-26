'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AuthPage() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleGoogle = async () => {
    try {
      setErrorMsg(null)
      setLoading(true)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
        },
      })

      if (error) throw error
      if (!data?.url) throw new Error('Supabase no retornó URL de OAuth')

      window.location.assign(data.url)
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
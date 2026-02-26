'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient' // ajusta la ruta si tu alias no es @

export default function AuthPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleGoogle = async () => {
  try {
    setErrorMsg(null)
    setLoading(true)

    console.log('CLICK GOOGLE')

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true, // 👈 clave: no depender del redirect automático
      },
    })

    console.log('OAUTH DATA:', data)

    if (error) throw error
    if (!data?.url) throw new Error('Supabase no retornó URL de OAuth')

    // 👇 redirect manual (garantizado)
    window.location.assign(data.url)
  } catch (e: any) {
    console.error('GOOGLE LOGIN ERROR:', e)
    setErrorMsg(e?.message ?? 'Error iniciando Google OAuth')
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md p-6 rounded-xl">
        <h1 className="text-3xl font-bold mb-2">BiYú</h1>

        {errorMsg && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800">
            {errorMsg}
          </div>
        )}

        <button
  type="button"
  onClick={() => {
    console.log('BOTON OK')
    alert('BOTON OK')
  }}
  className="w-full py-3 rounded-lg font-semibold"
>
  Continuar con Google
</button>
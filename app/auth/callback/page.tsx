'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        router.replace(`/auth?e=${encodeURIComponent(error.message)}`)
        return
      }

      if (data.session) {
        router.replace('/dashboard')
      } else {
        router.replace('/auth')
      }
    }

    run()
  }, [router])

  return <p style={{ padding: 24 }}>Procesando login…</p>
}
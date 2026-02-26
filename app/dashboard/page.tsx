import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/auth-helpers-nextjs'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createServerClient({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/auth')

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="bg-slate-800 p-8 rounded-xl shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">Bienvenido al Dashboard 🚀</h1>
        <p className="text-slate-400">Usuario: {session.user.email}</p>
      </div>
    </div>
  )
}
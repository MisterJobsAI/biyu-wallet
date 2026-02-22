"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserEmail(data.user.email ?? "Usuario");
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 to-black text-white p-6">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Hola 👋</h1>
        <p className="text-purple-300 text-sm">{userEmail ?? "..."}</p>
      </div>

      {/* Balance Card */}
      <div className="bg-purple-700 rounded-2xl p-6 shadow-lg mb-6">
        <p className="text-sm text-purple-200">Saldo disponible</p>
        <h2 className="text-3xl font-bold mt-2">$ 12,450.00</h2>
        <p className="text-xs text-purple-200 mt-1">Actualizado hoy</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <button className="bg-purple-800 rounded-xl p-4 text-sm">
          Enviar
        </button>
        <button className="bg-purple-800 rounded-xl p-4 text-sm">
          Recibir
        </button>
        <button className="bg-purple-800 rounded-xl p-4 text-sm">
          Tarjeta
        </button>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Movimientos recientes</h3>

        <div className="bg-purple-800 rounded-xl p-4 mb-3 flex justify-between">
          <span>Uber</span>
          <span className="text-red-400">- $24.50</span>
        </div>

        <div className="bg-purple-800 rounded-xl p-4 mb-3 flex justify-between">
          <span>Nómina</span>
          <span className="text-green-400">+ $1,200.00</span>
        </div>

        <div className="bg-purple-800 rounded-xl p-4 mb-3 flex justify-between">
          <span>Netflix</span>
          <span className="text-red-400">- $12.99</span>
        </div>
      </div>

    </div>
  );
}
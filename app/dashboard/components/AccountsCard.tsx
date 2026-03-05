"use client";

import { useEffect, useMemo, useState } from "react";

type Account = { id: string; name: string; balance: number; currency: string };

type Props = {
  accounts: Account[];
  activeAccountId?: string;
  onChangeActive?: (id: string) => void;
};

export default function AccountsCard({
  accounts,
  activeAccountId,
  onChangeActive,
}: Props) {
  const firstId = accounts?.[0]?.id;
  const [localActiveId, setLocalActiveId] = useState<string | undefined>(
    activeAccountId ?? firstId
  );

  // Carga/persiste en localStorage (solo client)
  useEffect(() => {
    const key = "biyu.activeAccountId";
    const saved = window.localStorage.getItem(key);
    if (!activeAccountId && saved && accounts.some((a) => a.id === saved)) {
      setLocalActiveId(saved);
      onChangeActive?.(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  useEffect(() => {
    if (!localActiveId) return;
    window.localStorage.setItem("biyu.activeAccountId", localActiveId);
  }, [localActiveId]);

  const active = useMemo(() => {
    const id = activeAccountId ?? localActiveId ?? firstId;
    return accounts.find((a) => a.id === id) ?? accounts[0];
  }, [accounts, activeAccountId, localActiveId, firstId]);

  return (
    <section
      style={{
        borderRadius: 16,
        padding: 20,
        background: "rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ fontWeight: 800, marginBottom: 12 }}>Cuenta activa</div>

      {!accounts || accounts.length === 0 ? (
        <div style={{ opacity: 0.8, fontSize: 14 }}>No tienes cuentas aún.</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={active?.id}
              onChange={(e) => {
                const id = e.target.value;
                setLocalActiveId(id);
                onChangeActive?.(id);
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                minWidth: 240,
              }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </select>

            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Saldo:{" "}
              <strong style={{ opacity: 1 }}>
                {(active?.balance ?? 0).toLocaleString("es-CO", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                {active?.currency}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            * Se guarda tu cuenta activa en este dispositivo.
          </div>
        </>
      )}
    </section>
  );
}
"use client";

type Account = { id: string; name: string; balance: number; currency: string };

export default function AccountsCard({ accounts }: { accounts: Account[] }) {
  const active = accounts?.[0];

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
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <select
              defaultValue={active?.id}
              disabled
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
              Activa: <strong style={{ opacity: 1 }}>{active?.name}</strong>
            </div>
          </div>

          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
            {(active?.balance ?? 0).toLocaleString("es-CO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>
              {active?.currency ?? ""}
            </span>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            * En el MVP el selector está deshabilitado (cuenta activa = primera
            cuenta).
          </div>
        </>
      )}
    </section>
  );
}
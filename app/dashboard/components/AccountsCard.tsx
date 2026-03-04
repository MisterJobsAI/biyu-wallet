type Account = { id: string; name: string; balance: number; currency: string };

export default function AccountsCard({ accounts }: { accounts: Account[] }) {
  const active = accounts[0];

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

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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
              {a.name} - {a.currency}
            </option>
          ))}
        </select>

        <button
          disabled
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
            fontWeight: 800,
          }}
        >
          Cambiar
        </button>

        <button
          disabled
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(160, 60, 255, 0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
            fontWeight: 900,
          }}
        >
          Crear cuenta
        </button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
        (MVP: 1 cuenta. En el siguiente paso habilitamos cambio/creación.)
      </div>
    </section>
  );
}
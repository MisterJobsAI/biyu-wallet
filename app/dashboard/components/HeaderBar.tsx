export default function HeaderBar({ email }: { email: string }) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 44, fontWeight: 900 }}>BiYú</h1>
        <p style={{ marginTop: 8, opacity: 0.85 }}>Logueado como {email}</p>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
          bootstrap_user()
        </button>

        <a
          href="/dashboard"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
            fontWeight: 800,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Refrescar
        </a>

        <a
          href="/logout"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
            fontWeight: 800,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Cerrar sesión
        </a>
      </div>
    </header>
  );
}
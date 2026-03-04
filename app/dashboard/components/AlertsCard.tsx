function formatCOP(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString("es-CO")}`;
}

export default function AlertsCard({
  spentCop,
  limitCop,
}: {
  spentCop: number;
  limitCop: number;
}) {
  const spent = Math.abs(Number(spentCop ?? 0));
  const limit = Math.max(0, Number(limitCop ?? 0));

  const exceeded = limit > 0 && spent > limit;

  return (
    <section
      style={{
        borderRadius: 16,
        padding: 20,
        background: "rgba(0,0,0,0.25)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 800 }}>Alertas</div>
        <div style={{ opacity: 0.75, fontWeight: 700 }}>Monitoreo del presupuesto</div>
      </div>

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: exceeded ? "rgba(255,0,80,0.85)" : "rgba(0,255,170,0.6)",
            display: "inline-block",
          }}
        />
        {exceeded ? (
          <span>
            Excediste el límite total del mes: <b>{formatCOP(spent)}</b> /{" "}
            <b>{formatCOP(limit)}</b>
          </span>
        ) : limit > 0 ? (
          <span>
            Vas bien: <b>{formatCOP(spent)}</b> de <b>{formatCOP(limit)}</b>
          </span>
        ) : (
          <span>Sin límite definido aún.</span>
        )}
      </div>
    </section>
  );
}
type Account = { id: string; name: string; balance: number; currency: string };

function formatCOP(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString("es-CO")}`;
}

export default function BalanceCard({
  accounts,
  monthExpenseCop,
  budgetLimitCop,
  monthLabel,
}: {
  accounts: Account[];
  monthExpenseCop: number;
  budgetLimitCop: number;
  monthLabel: string; // YYYY-MM-01
}) {
  const main = accounts[0];
  const balance = Number(main?.balance ?? 0);
  const spent = Math.abs(Number(monthExpenseCop ?? 0));
  const limit = Math.max(0, Number(budgetLimitCop ?? 0));
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

  return (
    <section
      style={{
        borderRadius: 16,
        padding: 20,
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ opacity: 0.9, fontWeight: 700 }}>Saldo</div>
          <div style={{ fontSize: 42, fontWeight: 900, marginTop: 6 }}>
            {formatCOP(balance)} {main?.currency ?? "COP"}
          </div>

          <div style={{ marginTop: 10, opacity: 0.9 }}>
            <b>Gastado:</b> {formatCOP(spent)}{" "}
            {limit > 0 ? (
              <>
                <span style={{ opacity: 0.7 }}> / </span>
                <b>Límite:</b> {formatCOP(limit)}
              </>
            ) : (
              <span style={{ opacity: 0.7 }}> (sin límite)</span>
            )}
          </div>
        </div>

        <div
          style={{
            alignSelf: "flex-start",
            padding: "6px 10px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.10)",
            fontSize: 12,
            fontWeight: 700,
            opacity: 0.95,
          }}
        >
          Mes: {monthLabel}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div
          style={{
            height: 10,
            borderRadius: 999,
            background: "rgba(255,255,255,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "rgba(255, 0, 80, 0.65)",
            }}
          />
        </div>
        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>{pct}%</div>
      </div>
    </section>
  );
}
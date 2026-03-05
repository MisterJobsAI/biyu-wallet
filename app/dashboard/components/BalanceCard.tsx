"use client";

type Account = {
  id: string;
  name: string;
  balance: number;
  currency: string;
};

type Props = {
  accounts: Account[];
  monthExpenseCop: number;
  budgetLimitCop: number;
  monthLabel: string; // "YYYY-MM"
};

export default function BalanceCard({
  accounts,
  monthExpenseCop,
  budgetLimitCop,
  monthLabel,
}: Props) {
  const totalBalance = (accounts ?? []).reduce(
    (sum, a) => sum + Number(a.balance ?? 0),
    0
  );

  const pct =
    budgetLimitCop > 0
      ? Math.min(100, Math.round((monthExpenseCop / budgetLimitCop) * 100))
      : 0;

  const money = (n: number) =>
    n.toLocaleString("es-CO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

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
        <div>
          <div style={{ fontWeight: 800 }}>Saldo total</div>
          <div style={{ opacity: 0.75, fontSize: 13, marginTop: 2 }}>
            {monthLabel}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1 }}>
            {money(totalBalance)}{" "}
            <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.85 }}>
              COP
            </span>
          </div>
          <div style={{ opacity: 0.75, fontSize: 12, marginTop: 4 }}>
            {accounts?.length ?? 0} cuenta(s)
          </div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 800 }}>Gasto del mes</div>
          <div style={{ fontWeight: 900 }}>{money(monthExpenseCop)} COP</div>
        </div>

        <div style={{ height: 8 }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ opacity: 0.8, fontSize: 13 }}>
            Presupuesto: {money(budgetLimitCop)} COP
          </div>
          <div style={{ opacity: 0.8, fontSize: 13 }}>{pct}%</div>
        </div>

        <div style={{ height: 10 }} />

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
              background: "rgba(255,255,255,0.55)",
            }}
          />
        </div>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          {pct >= 100
            ? "⚠️ Te pasaste del presupuesto este mes."
            : pct >= 80
            ? "👀 Vas cerca del límite del presupuesto."
            : "✅ Vas bien con tu presupuesto."}
        </div>
      </div>
    </section>
  );
}
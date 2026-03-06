"use client";

import { useEffect, useMemo, useState } from "react";

import BalanceCard from "./components/BalanceCard";
import AlertsCard from "./components/AlertsCard";
import AccountsCard from "./components/AccountsCard";
import AddEntryForm from "./AddEntryForm";
import LastMovements from "./components/LastMovements";

type Account = {
  id: string;
  name: string;
  balance: number;
  currency: string;
};

type Category = {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
};

type Entry = {
  amount: number;
  kind: "INCOME" | "EXPENSE";
  asset?: string | null;
  description?: string | null;
  occurred_at: string;
  account_id: string;
  category_id?: string | null;
};

type Props = {
  accounts: Account[];
  categories: Category[];
  entries: Entry[];
  monthLabel: string;
  budgetLimitCop: number;
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 20,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
};

const cardTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 16,
  marginBottom: 14,
};

const mutedStyle: React.CSSProperties = {
  opacity: 0.75,
  fontSize: 12,
};

function money(n: number) {
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString("es-CO", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export default function DashboardClient({
  accounts,
  categories,
  entries,
  monthLabel,
  budgetLimitCop,
}: Props) {
  const firstId = accounts?.[0]?.id;

  const [activeAccountId, setActiveAccountId] = useState<string | undefined>(
    firstId
  );

  useEffect(() => {
    const key = "biyu.activeAccountId";
    const saved = window.localStorage.getItem(key);

    if (saved && accounts.some((a) => a.id === saved)) {
      setActiveAccountId(saved);
    } else if (!saved && firstId) {
      setActiveAccountId(firstId);
    }
  }, [accounts, firstId]);

  useEffect(() => {
    if (!activeAccountId) return;
    window.localStorage.setItem("biyu.activeAccountId", activeAccountId);
  }, [activeAccountId]);

  const activeAccount = useMemo(() => {
    if (!activeAccountId) return accounts?.[0];
    return accounts.find((a) => a.id === activeAccountId) ?? accounts?.[0];
  }, [accounts, activeAccountId]);

  const filteredEntries = useMemo(() => {
    if (!activeAccountId) return entries ?? [];
    return (entries ?? []).filter((e) => e.account_id === activeAccountId);
  }, [entries, activeAccountId]);

  const recomputed = useMemo(() => {
    const income = (filteredEntries ?? [])
      .filter((e) => e.kind === "INCOME")
      .reduce((s, e) => s + Number(e.amount), 0);

    const expense = (filteredEntries ?? [])
      .filter((e) => e.kind === "EXPENSE")
      .reduce((s, e) => s + Math.abs(Number(e.amount)), 0);

    const catName = new Map<string, string>();
    (categories ?? []).forEach((c) => catName.set(c.id, c.name));

    const byCat = new Map<string, number>();
    for (const e of filteredEntries ?? []) {
      if (e.kind !== "EXPENSE") continue;
      const key = e.category_id ?? "uncat";
      byCat.set(key, (byCat.get(key) ?? 0) + Math.abs(Number(e.amount)));
    }

    const topCats = Array.from(byCat.entries())
      .map(([id, total]) => ({
        id,
        name: id === "uncat" ? "(sin categoría)" : catName.get(id) ?? id,
        total,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { income, expense, topCats };
  }, [filteredEntries, categories]);

  const budgetPct =
    budgetLimitCop > 0
      ? Math.min(100, Math.round((recomputed.expense / budgetLimitCop) * 100))
      : 0;

  const recentEntries = filteredEntries.slice(0, 5);

  return (
    <main style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "grid", gap: 18 }}>
        <BalanceCard
          accounts={accounts}
          monthExpenseCop={recomputed.expense}
          budgetLimitCop={budgetLimitCop}
          monthLabel={monthLabel}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
          }}
        >
          <AlertsCard spentCop={recomputed.expense} limitCop={budgetLimitCop} />

          <AccountsCard
            accounts={accounts}
            activeAccountId={activeAccountId}
            onChangeActive={setActiveAccountId}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <section style={cardStyle}>
            <div style={cardTitleStyle}>Este mes</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <div style={mutedStyle}>Ingresos</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>
                  {money(recomputed.income)}
                </div>
              </div>

              <div>
                <div style={mutedStyle}>Gastos</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>
                  {money(recomputed.expense)}
                </div>
              </div>

              <div>
                <div style={mutedStyle}>Neto</div>
                <div style={{ fontSize: 24, fontWeight: 900 }}>
                  {money(recomputed.income - recomputed.expense)}
                </div>
              </div>
            </div>

            <div style={{ height: 18 }} />

            <div style={mutedStyle}>Uso del presupuesto</div>
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  height: 12,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.10)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${budgetPct}%`,
                    background: "linear-gradient(90deg,#b026ff,#ff4fd8)",
                  }}
                />
              </div>
              <div style={{ marginTop: 8, ...mutedStyle }}>
                {money(recomputed.expense)} / {money(budgetLimitCop)} COP ·{" "}
                {budgetPct}%
              </div>
            </div>
          </section>

          <section style={cardStyle}>
            <div style={cardTitleStyle}>Top categorías (gasto)</div>

            {recomputed.topCats.length === 0 ? (
              <div style={mutedStyle}>Aún no hay gastos categorizados.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {recomputed.topCats.map((cat) => {
                  const pct =
                    recomputed.expense > 0
                      ? Math.round((cat.total / recomputed.expense) * 100)
                      : 0;

                  return (
                    <div key={cat.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{cat.name}</div>
                        <div style={mutedStyle}>
                          {money(cat.total)} · {pct}%
                        </div>
                      </div>

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
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section style={cardStyle}>
          <div style={cardTitleStyle}>Agregar movimiento</div>
          <AddEntryForm
            categories={categories}
            accountId={activeAccountId ?? firstId}
          />
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 1fr",
            gap: 18,
          }}
        >
          <section style={cardStyle}>
            <div style={cardTitleStyle}>Últimos movimientos</div>
            <LastMovements entries={filteredEntries as any} />
          </section>

          <section style={cardStyle}>
            <div style={cardTitleStyle}>Actividad reciente</div>

            {recentEntries.length === 0 ? (
              <div style={mutedStyle}>No hay actividad reciente.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {recentEntries.map((e, idx) => (
                  <div
                    key={`${e.occurred_at}-${idx}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      paddingBottom: 10,
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {e.description || "(sin descripción)"}
                      </div>
                      <div style={mutedStyle}>{formatDate(e.occurred_at)}</div>
                    </div>

                    <div
                      style={{
                        fontWeight: 900,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.kind === "EXPENSE" ? "-" : "+"}
                      {money(Math.abs(Number(e.amount)))} {e.asset ?? ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div style={{ ...mutedStyle, marginTop: 4 }}>
          Cuenta activa: <strong>{activeAccount?.name ?? "—"}</strong> ·
          categories={categories?.length ?? 0} · entries={entries?.length ?? 0}
          · filtered={filteredEntries?.length ?? 0}
        </div>
      </div>
    </main>
  );
}
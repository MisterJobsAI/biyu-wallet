"use client";

type Entry = {
  amount: number;
  kind: "INCOME" | "EXPENSE";
  asset?: string | null;
  description?: string | null;
  occurred_at: string;
  category_id?: string | null;
};

type Category = {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
  icon?: string | null;
};

type Props = {
  entries: Entry[];
  categories?: Category[];
};

function money(n: number) {
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDate(s: string) {
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

function iconFor(name?: string) {
  const n = (name ?? "").toLowerCase();

  if (n.includes("comida") || n.includes("café") || n.includes("cafe")) return "🍔";
  if (n.includes("transporte") || n.includes("bus") || n.includes("taxi")) return "🚌";
  if (n.includes("arriendo") || n.includes("renta") || n.includes("casa")) return "🏠";
  if (n.includes("entretenimiento") || n.includes("cine") || n.includes("juego")) return "🎬";
  if (n.includes("salario") || n.includes("ingreso")) return "💰";
  return "🧾";
}

export default function LastMovements({ entries, categories }: Props) {
  const catMap = new Map<string, Category>();
  (categories ?? []).forEach((c) => catMap.set(c.id, c));

  const list = (entries ?? []).slice(0, 12);

  if (!list.length) {
    return <div style={{ opacity: 0.7 }}>Aún no hay movimientos.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {list.map((e, idx) => {
        const cat = e.category_id ? catMap.get(e.category_id) : undefined;
        const catName = cat?.name ?? "(sin categoría)";
        const catIcon = (cat?.icon && cat.icon.trim()) ? cat.icon : iconFor(catName);

        const isExpense = e.kind === "EXPENSE";
        const abs = Math.abs(Number(e.amount));
        const sign = isExpense ? "-" : "+";

        return (
          <div
            key={`${e.occurred_at}-${idx}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 12px",
              borderRadius: 14,
              background: "rgba(0,0,0,0.20)",
              border: "1px solid rgba(255,255,255,0.10)",
            }}
          >
            <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  flex: "0 0 auto",
                }}
                aria-hidden
              >
                <span style={{ fontSize: 18 }}>{catIcon}</span>
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {e.description || catName}
                </div>

                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {fmtDate(e.occurred_at)} · {catName}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", flex: "0 0 auto" }}>
              <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                {sign}${money(abs)} {e.asset ?? ""}
              </div>

              <div
                style={{
                  marginTop: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                  background: isExpense ? "rgba(255,70,170,0.20)" : "rgba(80,255,170,0.16)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                {isExpense ? "Gasto" : "Ingreso"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
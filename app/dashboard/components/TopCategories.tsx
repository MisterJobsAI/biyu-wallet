"use client";

type TopCat = {
  id: string;
  name: string;
  total: number;
};

type Props = {
  topCats: TopCat[];
};

function money(n: number) {
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
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

export default function TopCategories({ topCats }: Props) {
  const total = (topCats ?? []).reduce((s, c) => s + Number(c.total), 0);

  if (!topCats || topCats.length === 0) {
    return <div style={{ opacity: 0.7 }}>Aún no hay gastos categorizados.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {topCats.map((cat) => {
        const pct = total > 0 ? Math.round((cat.total / total) * 100) : 0;

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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{iconFor(cat.name)}</span>
                <span style={{ fontWeight: 800 }}>{cat.name}</span>
              </div>

              <div style={{ opacity: 0.8, fontSize: 13 }}>
                ${money(cat.total)} · {pct}%
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
                  background: "linear-gradient(90deg,#b026ff,#ff4fd8)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
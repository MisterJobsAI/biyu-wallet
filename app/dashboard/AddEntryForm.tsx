"use client";

import { useMemo, useState } from "react";

type Category = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

export default function AddEntryForm({ categories }: { categories: Category[] }) {
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("10");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const cats = useMemo(() => categories.filter((c) => c.kind === kind), [categories, kind]);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ledger/entry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          amount: Number(amount),
          asset: "USDC",
          category_id: categoryId || null,
          description,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        try {
          const j = JSON.parse(text);
          alert(j.error ?? "Error");
        } catch {
          alert(text || "Error");
        }
        return;
      }

      // recarga para ver totales/movimientos
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h3>Agregar movimiento</h3>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Tipo:&nbsp;
          <select value={kind} onChange={(e) => setKind(e.target.value as any)}>
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
          </select>
        </label>

        <label>
          Monto:&nbsp;
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>

        <label>
          Categoría:&nbsp;
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">(sin categoría)</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Nota:&nbsp;
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <button onClick={submit} disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </section>
  );
}
"use client";

import { useMemo, useState, useEffect } from "react";

type Category = { id: string; name: string; kind: "INCOME" | "EXPENSE" };

type Props = {
  categories: Category[];
  accountId?: string;
};

export default function AddEntryForm({ categories, accountId }: Props) {
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState<string>("1000");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const cats = useMemo(() => {
  const list = (categories ?? []).filter(
    (c) => String(c.kind).trim().toUpperCase() === kind
  );

  return list.length ? list : (categories ?? []);
}, [categories, kind]);

    const submit = async () => {
    setLoading(true);
    setMsg("");

    // ✅ validar que exista cuenta activa
  if (!accountId) {
    setMsg("Error: no hay cuenta activa seleccionada.");
    setLoading(false);
    return;
  }
    try {
      const res = await fetch("/api/ledger/entry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
        kind,
        amount: Number(amount),
        asset: "COP",
        account_id: accountId, // ✅ nuevo (CLAVE)
        category_id: categoryId || null,
        description: description || null,
       }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(`Error: ${data?.error ?? res.statusText}`);
      } else {
        setMsg("✅ Guardado. Refresca para ver cambios.");
        setDescription("");
      }
      window.location.reload();
    } catch (e: any) {
      setMsg(`Error: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h3>Agregar movimiento</h3>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label>
          Tipo:{" "}
          <select value={kind} onChange={(e) => setKind(e.target.value as any)}>
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
          </select>
        </label>

        <label>
          Monto:{" "}
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
          />
        </label>

        <label>
        Categoría:{" "}

        {/* ✅ Debug temporal (quitar después) */}
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6, marginBottom: 6 }}>
       Debug categorías: total={(categories?.length ?? 0)} · para tipo {kind}: {cats.length}
       </div>

       <select
  value={categoryId}
  onChange={(e) => setCategoryId(e.target.value)}
  style={{
    padding: "8px 12px",
    borderRadius: 8,
    background: "#1a1325",
    color: "white",
    border: "1px solid rgba(255,255,255,0.2)",
    minWidth: 180
  }}
>
  <option value="">(sin categoría)</option>

  {(cats ?? []).map((c) => (
    <option key={c.id} value={c.id}>
      {c.name}
    </option>
  ))}
</select>
</label>

        <label>
          Nota:{" "}
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <button onClick={submit} disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
    </section>
  );
}
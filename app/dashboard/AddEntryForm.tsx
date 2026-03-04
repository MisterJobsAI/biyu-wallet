"use client";

import { useMemo, useState } from "react";

type Category = { id: string; name: string; kind: "INCOME" | "EXPENSE" };
type Account = { id: string; name: string };

export default function AddEntryForm({
  categories,
  accounts,
  defaultAccountId,
}: {
  categories: Category[];
  accounts: Account[];
  defaultAccountId: string;
}) {
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = useState("10000");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const cats = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind]
  );

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tx", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          amount_cop: Math.trunc(Number(amount)),
          account_id: accountId,
          category_id: categoryId || null,
          note: note || null,
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
          Bolsillo:&nbsp;
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Monto (COP):&nbsp;
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
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <button onClick={submit} disabled={loading}>
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </section>
  );
}
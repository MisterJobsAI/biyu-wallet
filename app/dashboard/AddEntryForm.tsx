"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  kind: "INCOME" | "EXPENSE";
};

type Props = {
  categories: Category[];
  accountId?: string;
};

export default function AddEntryForm({ categories, accountId }: Props) {
  const router = useRouter();

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

  useEffect(() => {
    if (!categoryId && cats.length) {
      setCategoryId(cats[0].id);
    }
  }, [categoryId, cats]);

  const submit = async () => {
    setLoading(true);
    setMsg("");

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
          account_id: accountId,
          category_id: categoryId || null,
          description: description || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMsg(`Error: ${data?.error ?? res.statusText}`);
        return;
      }

      setMsg("✅ Guardado.");
      setDescription("");
      setAmount("1000");

      if (cats.length) {
        setCategoryId(cats[0].id);
      } else {
        setCategoryId("");
      }

      router.refresh();
    } catch (e: any) {
      setMsg(`Error: ${e?.message ?? String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <label>
          <div style={{ marginBottom: 6 }}>Tipo:</div>
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as "INCOME" | "EXPENSE");
              setCategoryId("");
            }}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.16)",
              minWidth: 130,
            }}
          >
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
          </select>
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Monto:</div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.16)",
              minWidth: 180,
            }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 6 }}>Categoría:</div>

          <div
            style={{
              fontSize: 12,
              opacity: 0.7,
              marginBottom: 6,
            }}
          >
            Debug categorías: total={(categories?.length ?? 0)} · para tipo {kind}: {cats.length}
          </div>

          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "#1a1325",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              minWidth: 180,
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
          <div style={{ marginBottom: 6 }}>Nota:</div>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.16)",
              minWidth: 220,
            }}
          />
        </label>

        <button
          onClick={submit}
          disabled={loading}
          style={{
            padding: "12px 18px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(90deg,#b026ff,#ff4fd8)",
            color: "white",
            fontWeight: 800,
            cursor: "pointer",
            minWidth: 110,
          }}
        >
          {loading ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {msg ? (
        <p
          style={{
            marginTop: 12,
            color: msg.startsWith("Error") ? "#ffb4c7" : "white",
          }}
        >
          {msg}
        </p>
      ) : null}
    </section>
  );
}
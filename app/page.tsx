"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Account = {
  id: string;
  user_id: string;
  name: string;
  currency: string;
};

type Category = {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
};

type Tx = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  type: "credit" | "debit";
  amount_cop: number;
  note: string | null;
  occurred_at: string;
  status: string;
  created_at?: string;
  // ✅ Supabase a veces devuelve array en joins
  categories?: { name: string }[] | { name: string } | null;
};

type Budget = {
  id: string;
  user_id: string;
  account_id: string;
  month: string; // date
  total_limit_cop: number | null;
};

type BudgetLimit = {
  id: string;
  budget_id: string;
  category_id: string;
  limit_cop: number;
  // ✅ Supabase a veces devuelve array en joins
  categories?: { name: string }[] | { name: string } | null;
};

type AlertItem = {
  key: string;
  severity: "ok" | "warning" | "danger";
  message: string;
};

function formatCOP(n: number) {
  try {
    return new Intl.NumberFormat("es-CO").format(Math.round(n));
  } catch {
    return String(Math.round(n));
  }
}

function monthStartISO(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  return start.toISOString();
}
function nextMonthStartISO(d: Date) {
  const startNext = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return startNext.toISOString();
}
function monthLabel(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

// ✅ Helper: toma nombre de join (array u objeto)
function joinedName(
  joined: { name: string }[] | { name: string } | null | undefined
) {
  if (!joined) return null;
  if (Array.isArray(joined)) return joined[0]?.name ?? null;
  return joined.name ?? null;
}

export default function Page() {
  // 🔧 Pega aquí tu UUID real de “Sin categoría”
  const UNCATEGORIZED_ID = "2e13320f-fdf8-44a9-96ec-482baaac8e3f";

  // ✅ DEBUG env vars + conectividad (temporal)
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "UNDEFINED";
  const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "UNDEFINED";
  const SUPABASE_KEY_PREFIX =
    SUPABASE_KEY === "UNDEFINED" ? "UNDEFINED" : SUPABASE_KEY.slice(0, 8);

  const [msg, setMsg] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // data
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);

  // computed
  const [balance, setBalance] = useState<number>(0);
  const [spentTotalMonth, setSpentTotalMonth] = useState<number>(0);
  const [spentByCategory, setSpentByCategory] = useState<Record<string, number>>(
    {}
  );
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // UI inputs
  const [newAccountName, setNewAccountName] = useState<string>("");
  const [totalLimitInput, setTotalLimitInput] = useState<string>("0");

  const [limitCategoryId, setLimitCategoryId] = useState<string>("");
  const [limitCategoryValue, setLimitCategoryValue] = useState<string>("0");

  const [txAmount, setTxAmount] = useState<string>("0");
  const [txType, setTxType] = useState<"debit" | "credit">("debit");
  const [txCategoryId, setTxCategoryId] = useState<string>(UNCATEGORIZED_ID);
  const [txNote, setTxNote] = useState<string>("");

  const currentMonth = useMemo(() => new Date(), []);
      try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: "GET",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
      setMsg(`DEBUG: test fetch status=${r.status}`);
    } catch (e: any) {
      setMsg(`DEBUG: test fetch error=${e?.message || String(e)}`);
    }
  };

  // -----------------------------
  // AUTH
  // -----------------------------
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? "";
      setUserEmail(email);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUserEmail(session?.user?.email ?? "");
      });

      return () => sub.subscription.unsubscribe();
    };
    init();
  }, []);

  const signIn = async () => {
    setMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setMsg(error ? error.message : "Revisa tu correo.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMsg("Sesión cerrada.");
    // reset UI
    setAccounts([]);
    setSelectedAccountId("");
    setCategories([]);
    setBudget(null);
    setBudgetLimits([]);
    setTxs([]);
    setBalance(0);
    setSpentTotalMonth(0);
    setSpentByCategory({});
    setAlerts([]);
  };

  // -----------------------------
  // BOOTSTRAP + LOAD DATA
  // -----------------------------
  const bootstrap = async () => {
    setMsg("");
    const { error } = await supabase.rpc("bootstrap_user");
    setMsg(error ? error.message : "Wallet creada correctamente.");
    await refreshData(true);
  };

  const refreshData = async (forcePickAccount = false) => {
    setMsg("");
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setMsg("No logueado.");
      return;
    }

    // 1) cuentas
    const { data: accs, error: accErr } = await supabase
      .from("accounts")
      .select("id,user_id,name,currency")
      .order("name", { ascending: true });

    if (accErr) {
      setMsg(`Error cargando cuentas: ${accErr.message}`);
      return;
    }
    const accList = (accs ?? []) as Account[];
    setAccounts(accList);

    // pick account
    let accountId = selectedAccountId;
    if (forcePickAccount || !accountId) {
      accountId = accList[0]?.id ?? "";
      setSelectedAccountId(accountId);
    }

    // 2) categorías
    const { data: cats, error: catErr } = await supabase
      .from("categories")
      .select("id,user_id,name,icon")
      .order("name", { ascending: true });

    if (catErr) {
      setMsg(`Error cargando categorías: ${catErr.message}`);
      return;
    }
    const catList = (cats ?? []) as Category[];
    setCategories(catList);

    // 3) presupuesto del mes para esa cuenta
    if (!accountId) {
      setBudget(null);
      setBudgetLimits([]);
      setTxs([]);
      setBalance(0);
      setSpentTotalMonth(0);
      setSpentByCategory({});
      setAlerts([]);
      return;
    }

    const monthStr = monthLabel(currentMonth);

    await supabase.from("budgets").upsert(
      {
        user_id: user.id,
        account_id: accountId,
        month: monthStr,
        total_limit_cop: null,
      },
      { onConflict: "user_id,account_id,month" }
    );

    const { data: bud, error: budErr } = await supabase
      .from("budgets")
      .select("id,user_id,account_id,month,total_limit_cop")
      .eq("account_id", accountId)
      .eq("user_id", user.id)
      .eq("month", monthStr)
      .maybeSingle();

    if (budErr) {
      setMsg(`Error cargando budget: ${budErr.message}`);
      return;
    }
    const budRow = (bud ?? null) as Budget | null;
    setBudget(budRow);
    setTotalLimitInput(String(budRow?.total_limit_cop ?? 0));

    // 4) budget_limits (NO usar created_at)
    if (budRow?.id) {
      const { data: bl, error: blErr } = await supabase
        .from("budget_limits")
        .select("id,budget_id,category_id,limit_cop,categories(name)")
        .eq("budget_id", budRow.id)
        .order("id", { ascending: true });

      if (blErr) {
        setMsg(`Error cargando límites: ${blErr.message}`);
        return;
      }
      setBudgetLimits((bl ?? []) as BudgetLimit[]);
    } else {
      setBudgetLimits([]);
    }

    // 5) historial transacciones
    const { data: txHist, error: txHistErr } = await supabase
      .from("transactions")
      .select(
        "id,user_id,account_id,category_id,type,amount_cop,note,occurred_at,status,created_at,categories(name)"
      )
      .eq("account_id", accountId)
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (txHistErr) {
      setMsg(`Error cargando transacciones: ${txHistErr.message}`);
      return;
    }
    const hist = (txHist ?? []) as Tx[];
    setTxs(hist);

    // 6) balance
    const { data: txForBalance, error: balErr } = await supabase
      .from("transactions")
      .select("type,amount_cop")
      .eq("account_id", accountId);

    if (balErr) {
      setMsg(`Error calculando balance: ${balErr.message}`);
      return;
    }
    let bal = 0;
    for (const r of txForBalance ?? []) {
      const amount = Number((r as any).amount_cop ?? 0);
      const t = (r as any).type;
      if (t === "credit") bal += amount;
      if (t === "debit") bal -= amount;
    }
    setBalance(bal);

    // 7) gastado del mes
    const start = monthStartISO(currentMonth);
    const next = nextMonthStartISO(currentMonth);

    const { data: txMonth, error: txMonthErr } = await supabase
      .from("transactions")
      .select("category_id,type,amount_cop,occurred_at,status")
      .eq("account_id", accountId)
      .eq("type", "debit")
      .eq("status", "posted")
      .gte("occurred_at", start)
      .lt("occurred_at", next);

    if (txMonthErr) {
      setMsg(`Error cargando gastado del mes: ${txMonthErr.message}`);
      return;
    }

    let totalSpent = 0;
    const byCat: Record<string, number> = {};
    for (const r of txMonth ?? []) {
      const amount = Number((r as any).amount_cop ?? 0);
      const catId = (r as any).category_id ?? null;
      totalSpent += amount;
      if (catId) byCat[catId] = (byCat[catId] ?? 0) + amount;
      else byCat[UNCATEGORIZED_ID] = (byCat[UNCATEGORIZED_ID] ?? 0) + amount;
    }
    setSpentTotalMonth(totalSpent);
    setSpentByCategory(byCat);

    // 8) alertas
    const computedAlerts: AlertItem[] = [];

    const totalLimit = Number(budRow?.total_limit_cop ?? 0);
    if (totalLimit > 0) {
      const ratio = totalSpent / totalLimit;
      if (ratio >= 1) {
        computedAlerts.push({
          key: "total-danger",
          severity: "danger",
          message: `Excediste el límite total del mes: $${formatCOP(
            totalSpent
          )} / $${formatCOP(totalLimit)} COP`,
        });
      } else if (ratio >= 0.8) {
        computedAlerts.push({
          key: "total-warning",
          severity: "warning",
          message: `Cerca del límite total del mes: $${formatCOP(
            totalSpent
          )} / $${formatCOP(totalLimit)} COP`,
        });
      }
    }

    for (const lim of (budgetLimits ?? []) as BudgetLimit[]) {
      const limValue = Number(lim.limit_cop ?? 0);
      if (!limValue || limValue <= 0) continue;

      const catId = lim.category_id;
      const spent = Number(byCat[catId] ?? 0);
      const ratio = spent / limValue;

      const catName =
        joinedName(lim.categories) ??
        categories.find((c) => c.id === catId)?.name ??
        "Categoría";

      if (ratio >= 1) {
        computedAlerts.push({
          key: `cat-danger-${catId}`,
          severity: "danger",
          message: `Excediste ${catName}: $${formatCOP(spent)} / $${formatCOP(
            limValue
          )} COP`,
        });
      } else if (ratio >= 0.8) {
        computedAlerts.push({
          key: `cat-warning-${catId}`,
          severity: "warning",
          message: `Cerca del límite en ${catName}: $${formatCOP(
            spent
          )} / $${formatCOP(limValue)} COP`,
        });
      }
    }

    if (computedAlerts.length === 0) {
      computedAlerts.push({
        key: "ok",
        severity: "ok",
        message: "No hay alertas por ahora.",
      });
    }
    setAlerts(computedAlerts);
  };

  useEffect(() => {
    if (userEmail) {
      refreshData(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // -----------------------------
  // ACTIONS
  // -----------------------------
  const createAccount = async () => {
    setMsg("");
    const name = newAccountName.trim();
    if (!name) {
      setMsg("Escribe un nombre para la cuenta.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setMsg("No logueado.");
      return;
    }

    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name,
      currency: "COP",
    });

    if (error) {
      setMsg(`Error creando cuenta: ${error.message}`);
      return;
    }
    setNewAccountName("");
    await refreshData(true);
    setMsg("Cuenta creada.");
  };

  const saveTotalLimit = async () => {
    setMsg("");
    if (!budget?.id) {
      setMsg("No hay presupuesto activo (ejecuta bootstrap_user()).");
      return;
    }

    const value = Number(totalLimitInput || 0);
    const { error } = await supabase
      .from("budgets")
      .update({ total_limit_cop: value })
      .eq("id", budget.id);

    setMsg(
      error ? `Error guardando límite total: ${error.message}` : "Límite total guardado."
    );
    await refreshData(false);
  };

  const saveCategoryLimit = async () => {
    setMsg("");
    if (!budget?.id) {
      setMsg("No hay presupuesto activo (ejecuta bootstrap_user()).");
      return;
    }
    const catId = limitCategoryId || "";
    const limitValue = Number(limitCategoryValue || 0);

    if (!catId) {
      setMsg("Selecciona una categoría.");
      return;
    }

    const { data: existing, error: exErr } = await supabase
      .from("budget_limits")
      .select("id")
      .eq("budget_id", budget.id)
      .eq("category_id", catId)
      .maybeSingle();

    if (exErr) {
      setMsg(`Error consultando límite: ${exErr.message}`);
      return;
    }

    if (existing?.id) {
      const { error } = await supabase
        .from("budget_limits")
        .update({ limit_cop: limitValue })
        .eq("id", existing.id);
      if (error) {
        setMsg(`Error actualizando límite: ${error.message}`);
        return;
      }
    } else {
      const { error } = await supabase.from("budget_limits").insert({
        budget_id: budget.id,
        category_id: catId,
        limit_cop: limitValue,
      });
      if (error) {
        setMsg(`Error creando límite: ${error.message}`);
        return;
      }
    }

    setMsg("Límite por categoría guardado.");
    setLimitCategoryValue("0");
    await refreshData(false);
  };

  const saveTransaction = async () => {
    setMsg("");
    const amount = Number(txAmount || 0);
    if (!selectedAccount) {
      setMsg("No hay cuenta activa (ejecuta bootstrap_user()).");
      return;
    }
    if (!amount || amount <= 0) {
      setMsg("Escribe un monto mayor a 0.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setMsg("No logueado.");
      return;
    }

    const categoryIdToSave = (txCategoryId || "").trim() || UNCATEGORIZED_ID;

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      account_id: selectedAccount.id,
      type: txType,
      amount_cop: amount,
      category_id: categoryIdToSave,
      note: txNote.trim() ? txNote.trim() : null,
      status: "posted",
      occurred_at: new Date().toISOString(),
    });

    if (error) {
      setMsg(`Error guardando transacción: ${error.message}`);
      return;
    }

    setMsg("Transacción guardada.");
    setTxAmount("0");
    setTxNote("");
    await refreshData(false);
  };

  // UI helpers
  const categoryNameById = (id: string | null) => {
    if (!id) return "Sin categoría";
    const found = categories.find((c) => c.id === id);
    return found?.name ?? "Sin categoría";
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  if (!userEmail) {
    return (
      <main style={{ padding: 40, maxWidth: 900 }}>
        <h1>BiYú</h1>

                <p style={{ marginTop: 10 }}>Estado: No logueado</p>

        <div style={{ marginTop: 24 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            style={{ padding: 10, width: 320, marginRight: 12 }}
          />
          <button onClick={signIn} style={{ padding: 10 }}>
            Login con Magic Link
          </button>

                  </div>

        {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
      </main>
    );
  }

  return (
    <main style={{ padding: 40, maxWidth: 900 }}>
      <h1>BiYú</h1>

      {/* ✅ DEBUG (temporal) */}
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
        <div>URL: {SUPABASE_URL}</div>
        <div>KEY: {SUPABASE_KEY_PREFIX}</div>
      </div>

      <p style={{ marginTop: 10 }}>Estado: Logueado como {userEmail}</p>

      <h2 style={{ marginTop: 10 }}>Saldo: ${formatCOP(balance)} COP</h2>

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={bootstrap}>Ejecutar bootstrap_user()</button>
        <button onClick={() => refreshData(false)}>Refrescar</button>
        <button onClick={signOut}>Cerrar sesión</button>
      </div>

      <hr style={{ margin: "24px 0" }} />

      <h3>Alertas</h3>
      <div style={{ marginTop: 8 }}>
        {alerts.map((a) => (
          <div key={a.key} style={{ marginBottom: 8 }}>
            {a.severity === "ok" && <span>✅ </span>}
            {a.severity === "warning" && <span>🟠 </span>}
            {a.severity === "danger" && <span>🔴 </span>}
            <span>{a.message}</span>
          </div>
        ))}
      </div>

      <hr style={{ margin: "24px 0" }} />

      <h3>Cuenta activa</h3>

      {accounts.length === 0 ? (
        <p>No hay cuentas todavía (ejecuta bootstrap_user()).</p>
      ) : (
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          style={{ padding: 10, width: 320 }}
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.currency}
            </option>
          ))}
        </select>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <input
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
          placeholder="Nueva cuenta (ej: Ahorros, Efectivo, Nequi)"
          style={{ padding: 10, width: 420 }}
        />
        <button onClick={createAccount}>Crear cuenta</button>
      </div>

      <hr style={{ margin: "24px 0" }} />

      <h3>Presupuesto del mes (por cuenta)</h3>
      <p>
        Mes: <b>{monthLabel(currentMonth)}</b> · Gastado:{" "}
        <b>${formatCOP(spentTotalMonth)} COP</b>
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ minWidth: 320 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Límite total del mes (COP)</div>
          <input
            value={totalLimitInput}
            onChange={(e) => setTotalLimitInput(e.target.value)}
            style={{ padding: 10, width: 220 }}
          />
        </div>
        <button onClick={saveTotalLimit}>Guardar límite total</button>
      </div>

      <div style={{ marginTop: 18, padding: 12, border: "1px solid #e5e5e5", borderRadius: 10 }}>
        <h4 style={{ marginTop: 0 }}>Límites por categoría</h4>

        {categories.length === 0 ? (
          <p>No hay categorías.</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <select
                value={limitCategoryId}
                onChange={(e) => setLimitCategoryId(e.target.value)}
                style={{ padding: 10, width: 280 }}
              >
                <option value="">Selecciona categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                value={limitCategoryValue}
                onChange={(e) => setLimitCategoryValue(e.target.value)}
                style={{ padding: 10, width: 140 }}
              />

              <button onClick={saveCategoryLimit}>Guardar límite categoría</button>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.8 }}>
              Tip: escribe un límite y luego guárdalo.
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {budgetLimits.length === 0 ? (
                <div>No hay límites por categoría todavía.</div>
              ) : (
                budgetLimits.map((bl) => {
                  const catName =
                    joinedName(bl.categories) ??
                    categories.find((c) => c.id === bl.category_id)?.name ??
                    "Categoría";

                  const limit = Number(bl.limit_cop ?? 0);
                  const spent = Number(spentByCategory[bl.category_id] ?? 0);
                  const ratio = limit > 0 ? spent / limit : 0;

                  let statusLabel = "Sin límite";
                  if (limit > 0) {
                    if (ratio >= 1) statusLabel = `Excedido (${Math.round(ratio * 100)}%)`;
                    else if (ratio >= 0.8)
                      statusLabel = `Cerca del límite (${Math.round(ratio * 100)}%)`;
                    else statusLabel = "OK";
                  }

                  return (
                    <div key={bl.id} style={{ padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{catName}</div>
                          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
                            Gastado: ${formatCOP(spent)} · Límite: ${formatCOP(limit)} · {statusLabel}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700 }}>${formatCOP(limit)} COP</div>
                      </div>

                      <div style={{ marginTop: 10, height: 10, background: "#eee", borderRadius: 6 }}>
                        <div
                          style={{
                            height: 10,
                            width: `${Math.min(100, Math.round(ratio * 100))}%`,
                            background: ratio >= 1 ? "#d32f2f" : ratio >= 0.8 ? "#f57c00" : "#2e7d32",
                            borderRadius: 6,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <hr style={{ margin: "24px 0" }} />

      <h3>Nueva transacción</h3>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          value={txAmount}
          onChange={(e) => setTxAmount(e.target.value)}
          style={{ padding: 10, width: 220 }}
          placeholder="0"
        />

        <select
          value={txType}
          onChange={(e) => setTxType(e.target.value as "debit" | "credit")}
          style={{ padding: 10, width: 180 }}
        >
          <option value="debit">Gasto</option>
          <option value="credit">Ingreso</option>
        </select>

        <select
          value={txCategoryId}
          onChange={(e) => setTxCategoryId(e.target.value)}
          style={{ padding: 10, width: 240 }}
        >
          <option value={UNCATEGORIZED_ID}>Sin categoría</option>
          {categories
            .filter((c) => c.id !== UNCATEGORIZED_ID)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          value={txNote}
          onChange={(e) => setTxNote(e.target.value)}
          placeholder="Descripción (opcional)"
          style={{ padding: 10, width: 520 }}
        />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={saveTransaction}>Guardar transacción</button>
      </div>

      <hr style={{ margin: "24px 0" }} />

      <h3>Historial</h3>
      {txs.length === 0 ? (
        <p>No hay transacciones.</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {txs.map((t) => {
            const isCredit = t.type === "credit";
            const amt = Number(t.amount_cop ?? 0);

            const catName =
              joinedName(t.categories) ?? categoryNameById(t.category_id) ?? "Sin categoría";

            const title = isCredit ? "Ingreso" : "Gasto";
            const sign = isCredit ? "+" : "-";
            const dateStr = new Date(t.occurred_at).toLocaleString("es-CO");

            return (
              <div key={t.id}>
                <div
                  style={{
                    fontWeight: 800,
                    color: isCredit ? "green" : "red",
                    fontSize: 16,
                  }}
                >
                  {title} - {sign}${formatCOP(amt)} COP
                </div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>
                  {title} · {catName} · {dateStr} · {t.status}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Account = { id: string; user_id: string; name: string; currency: string };
type Category = { id: string; user_id: string; name: string; icon: string | null };

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
  categories?: { name: string }[] | { name: string } | null;
};

type Budget = {
  id: string;
  user_id: string;
  account_id: string;
  month: string;
  total_limit_cop: number | null;
};

type BudgetLimit = {
  id: string;
  budget_id: string;
  category_id: string;
  limit_cop: number;
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
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function nextMonthStartISO(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
}
function monthLabel(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function joinedName(joined: { name: string }[] | { name: string } | null | undefined) {
  if (!joined) return null;
  if (Array.isArray(joined)) return joined[0]?.name ?? null;
  return joined.name ?? null;
}

export default function Page() {
  const UNCATEGORIZED_ID = "2e13320f-fdf8-44a9-96ec-482baaac8e3f";

  const [msg, setMsg] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [email, setEmail] = useState<string>("");

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

  const [balance, setBalance] = useState<number>(0);
  const [spentTotalMonth, setSpentTotalMonth] = useState<number>(0);
  const [spentByCategory, setSpentByCategory] = useState<Record<string, number>>({});
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const [newAccountName, setNewAccountName] = useState<string>("");
  const [totalLimitInput, setTotalLimitInput] = useState<string>("0");

  const [limitCategoryId, setLimitCategoryId] = useState<string>("");
  const [limitCategoryValue, setLimitCategoryValue] = useState<string>("0");

  const [txAmount, setTxAmount] = useState<string>("0");
  const [txType, setTxType] = useState<"debit" | "credit">("debit");
  const [txCategoryId, setTxCategoryId] = useState<string>(UNCATEGORIZED_ID);
  const [txNote, setTxNote] = useState<string>("");

  const currentMonth = useMemo(() => new Date(), []);

  // -----------------------------
  // AUTH
  // -----------------------------
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setUserEmail(data.session?.user?.email ?? "");

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
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setMsg(error ? error.message : "Revisa tu correo para el Magic Link.");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMsg("Sesión cerrada.");
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
  // DATA
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

    if (accErr) return setMsg(`Error cargando cuentas: ${accErr.message}`);
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

    if (catErr) return setMsg(`Error cargando categorías: ${catErr.message}`);
    const catList = (cats ?? []) as Category[];
    setCategories(catList);

    // reset si no hay account
    if (!accountId) {
      setBudget(null);
      setBudgetLimits([]);
      setTxs([]);
      setBalance(0);
      setSpentTotalMonth(0);
      setSpentByCategory({});
      setAlerts([{ key: "ok", severity: "ok", message: "Crea una cuenta o ejecuta bootstrap_user()." }]);
      return;
    }

    // 3) budget mes
    const monthStr = monthLabel(currentMonth);

    await supabase.from("budgets").upsert(
      { user_id: user.id, account_id: accountId, month: monthStr, total_limit_cop: null },
      { onConflict: "user_id,account_id,month" }
    );

    const { data: bud, error: budErr } = await supabase
      .from("budgets")
      .select("id,user_id,account_id,month,total_limit_cop")
      .eq("account_id", accountId)
      .eq("user_id", user.id)
      .eq("month", monthStr)
      .maybeSingle();

    if (budErr) return setMsg(`Error cargando budget: ${budErr.message}`);
    const budRow = (bud ?? null) as Budget | null;
    setBudget(budRow);
    setTotalLimitInput(String(budRow?.total_limit_cop ?? 0));

    // 4) budget_limits
    if (budRow?.id) {
      const { data: bl, error: blErr } = await supabase
        .from("budget_limits")
        .select("id,budget_id,category_id,limit_cop,categories(name)")
        .eq("budget_id", budRow.id)
        .order("id", { ascending: true });

      if (blErr) return setMsg(`Error cargando límites: ${blErr.message}`);
      setBudgetLimits((bl ?? []) as BudgetLimit[]);
    } else {
      setBudgetLimits([]);
    }

    // 5) historial tx
    const { data: txHist, error: txHistErr } = await supabase
      .from("transactions")
      .select("id,user_id,account_id,category_id,type,amount_cop,note,occurred_at,status,created_at,categories(name)")
      .eq("account_id", accountId)
      .order("occurred_at", { ascending: false })
      .limit(50);

    if (txHistErr) return setMsg(`Error cargando transacciones: ${txHistErr.message}`);
    const hist = (txHist ?? []) as Tx[];
    setTxs(hist);

    // 6) balance
    const { data: txForBalance, error: balErr } = await supabase
      .from("transactions")
      .select("type,amount_cop")
      .eq("account_id", accountId);

    if (balErr) return setMsg(`Error calculando balance: ${balErr.message}`);

    let bal = 0;
    for (const r of txForBalance ?? []) {
      const amount = Number((r as any).amount_cop ?? 0);
      const t = (r as any).type;
      if (t === "credit") bal += amount;
      if (t === "debit") bal -= amount;
    }
    setBalance(bal);

    // 7) gasto del mes
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

    if (txMonthErr) return setMsg(`Error cargando gastado del mes: ${txMonthErr.message}`);

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
          message: `Excediste el límite total del mes: $${formatCOP(totalSpent)} / $${formatCOP(totalLimit)} COP`,
        });
      } else if (ratio >= 0.8) {
        computedAlerts.push({
          key: "total-warning",
          severity: "warning",
          message: `Cerca del límite total del mes: $${formatCOP(totalSpent)} / $${formatCOP(totalLimit)} COP`,
        });
      }
    }

    for (const lim of budgetLimits ?? []) {
      const limValue = Number(lim.limit_cop ?? 0);
      if (!limValue || limValue <= 0) continue;

      const catId = lim.category_id;
      const spent = Number(byCat[catId] ?? 0);
      const ratio = spent / limValue;

      const catName =
        joinedName(lim.categories) ??
        catList.find((c) => c.id === catId)?.name ??
        "Categoría";

      if (ratio >= 1) {
        computedAlerts.push({
          key: `cat-danger-${catId}`,
          severity: "danger",
          message: `Excediste ${catName}: $${formatCOP(spent)} / $${formatCOP(limValue)} COP`,
        });
      } else if (ratio >= 0.8) {
        computedAlerts.push({
          key: `cat-warning-${catId}`,
          severity: "warning",
          message: `Cerca del límite en ${catName}: $${formatCOP(spent)} / $${formatCOP(limValue)} COP`,
        });
      }
    }

    if (computedAlerts.length === 0) {
      computedAlerts.push({ key: "ok", severity: "ok", message: "No hay alertas por ahora." });
    }
    setAlerts(computedAlerts);
  };

  useEffect(() => {
    if (userEmail) refreshData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // -----------------------------
  // ACTIONS
  // -----------------------------
  const createAccount = async () => {
    setMsg("");
    const name = newAccountName.trim();
    if (!name) return setMsg("Escribe un nombre para la cuenta.");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return setMsg("No logueado.");

    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name,
      currency: "COP",
    });

    if (error) return setMsg(`Error creando cuenta: ${error.message}`);
    setNewAccountName("");
    await refreshData(true);
    setMsg("Cuenta creada.");
  };

  const saveTotalLimit = async () => {
    setMsg("");
    if (!budget?.id) return setMsg("No hay presupuesto activo (ejecuta bootstrap_user()).");

    const value = Number(totalLimitInput || 0);
    const { error } = await supabase.from("budgets").update({ total_limit_cop: value }).eq("id", budget.id);

    setMsg(error ? `Error guardando límite total: ${error.message}` : "Límite total guardado.");
    await refreshData(false);
  };

  const saveCategoryLimit = async () => {
    setMsg("");
    if (!budget?.id) return setMsg("No hay presupuesto activo (ejecuta bootstrap_user()).");

    const catId = limitCategoryId || "";
    const limitValue = Number(limitCategoryValue || 0);
    if (!catId) return setMsg("Selecciona una categoría.");

    const { data: existing, error: exErr } = await supabase
      .from("budget_limits")
      .select("id")
      .eq("budget_id", budget.id)
      .eq("category_id", catId)
      .maybeSingle();

    if (exErr) return setMsg(`Error consultando límite: ${exErr.message}`);

    if (existing?.id) {
      const { error } = await supabase.from("budget_limits").update({ limit_cop: limitValue }).eq("id", existing.id);
      if (error) return setMsg(`Error actualizando límite: ${error.message}`);
    } else {
      const { error } = await supabase.from("budget_limits").insert({
        budget_id: budget.id,
        category_id: catId,
        limit_cop: limitValue,
      });
      if (error) return setMsg(`Error creando límite: ${error.message}`);
    }

    setMsg("Límite por categoría guardado.");
    setLimitCategoryValue("0");
    await refreshData(false);
  };

  const saveTransaction = async () => {
    setMsg("");
    const amount = Number(txAmount || 0);
    if (!selectedAccount) return setMsg("No hay cuenta activa (ejecuta bootstrap_user()).");
    if (!amount || amount <= 0) return setMsg("Escribe un monto mayor a 0.");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return setMsg("No logueado.");

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

    if (error) return setMsg(`Error guardando transacción: ${error.message}`);

    setMsg("Transacción guardada.");
    setTxAmount("0");
    setTxNote("");
    await refreshData(false);
  };

  const monthStr = monthLabel(currentMonth);
  const totalLimit = Number(budget?.total_limit_cop ?? 0);
  const remaining = totalLimit > 0 ? Math.max(0, totalLimit - spentTotalMonth) : 0;
  const burn = totalLimit > 0 ? Math.min(100, Math.round((spentTotalMonth / totalLimit) * 100)) : 0;

  // -----------------------------
  // RENDER
  // -----------------------------
  if (!userEmail) {
    return (
      <main>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1>BiYú</h1>
            <div className="muted">Tu dinero claro y bajo control</div>
          </div>
          <div className="badge">🔐 Acceso seguro</div>
        </div>

        <hr />

        <div className="card">
          <div className="muted">Estado</div>
          <div style={{ fontWeight: 800, marginTop: 6 }}>No logueado</div>

          <div className="row" style={{ marginTop: 14 }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={{ minWidth: 260 }}
            />
            <button onClick={signIn}>Login con Magic Link</button>
          </div>

          {msg && <div className="muted" style={{ marginTop: 12 }}>{msg}</div>}
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>BiYú</h1>
          <div className="muted">Logueado como {userEmail}</div>
        </div>

        <div className="row">
          <button className="secondary" onClick={bootstrap}>bootstrap_user()</button>
          <button className="secondary" onClick={() => refreshData(false)}>Refrescar</button>
          <button className="secondary" onClick={signOut}>Cerrar sesión</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <div className="muted">Saldo</div>
            <div style={{ fontSize: 34, fontWeight: 900, marginTop: 6 }}>
              ${formatCOP(balance)} <span className="muted">COP</span>
            </div>
          </div>

          <div className="badge">📅 Mes: {monthStr}</div>
        </div>

        {totalLimit > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="muted">
                Gastado: <b>${formatCOP(spentTotalMonth)}</b> · Disponible: <b>${formatCOP(remaining)}</b>
              </div>
              <div className="muted">{burn}%</div>
            </div>
            <div style={{ marginTop: 10, height: 10, background: "rgba(255,255,255,.10)", borderRadius: 999 }}>
              <div
                style={{
                  height: 10,
                  width: `${burn}%`,
                  borderRadius: 999,
                  background: burn >= 100 ? "#ef4444" : burn >= 80 ? "#f59e0b" : "#22c55e",
                }}
              />
            </div>
          </div>
        )}
      </div>

      <hr />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900 }}>Alertas</div>
          <div className="muted">Monitoreo del presupuesto</div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {alerts.map((a) => (
            <div key={a.key} className="row">
              {a.severity === "ok" && <span>✅</span>}
              {a.severity === "warning" && <span>🟠</span>}
              {a.severity === "danger" && <span>🔴</span>}
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      </div>

      <hr />

      <div className="row" style={{ alignItems: "stretch" }}>
        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <div style={{ fontWeight: 900 }}>Cuenta activa</div>

          {accounts.length === 0 ? (
            <div className="muted" style={{ marginTop: 10 }}>
              No hay cuentas todavía (ejecuta bootstrap_user()).
            </div>
          ) : (
            <div className="row" style={{ marginTop: 10 }}>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{ minWidth: 280 }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.currency}
                  </option>
                ))}
              </select>
              <button className="secondary" onClick={() => refreshData(false)}>Cambiar</button>
            </div>
          )}

          <div className="row" style={{ marginTop: 12 }}>
            <input
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="Nueva cuenta (Ahorros, Efectivo, Nequi)"
              style={{ flex: 1, minWidth: 240 }}
            />
            <button onClick={createAccount}>Crear cuenta</button>
          </div>
        </div>

        <div className="card" style={{ flex: 1, minWidth: 320 }}>
          <div style={{ fontWeight: 900 }}>Presupuesto del mes</div>
          <div className="muted" style={{ marginTop: 8 }}>
            Mes: <b>{monthStr}</b> · Gastado: <b>${formatCOP(spentTotalMonth)} COP</b>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="muted">Límite total (COP)</div>
              <input
                value={totalLimitInput}
                onChange={(e) => setTotalLimitInput(e.target.value)}
                style={{ width: "100%", marginTop: 6 }}
              />
            </div>
            <button onClick={saveTotalLimit}>Guardar</button>
          </div>

          <hr />

          <div style={{ fontWeight: 800 }}>Límites por categoría</div>
          {categories.length === 0 ? (
            <div className="muted" style={{ marginTop: 10 }}>No hay categorías.</div>
          ) : (
            <>
              <div className="row" style={{ marginTop: 10 }}>
                <select
                  value={limitCategoryId}
                  onChange={(e) => setLimitCategoryId(e.target.value)}
                  style={{ minWidth: 220 }}
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
                  style={{ width: 140 }}
                />

                <button onClick={saveCategoryLimit}>Guardar</button>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {budgetLimits.length === 0 ? (
                  <div className="muted">No hay límites por categoría todavía.</div>
                ) : (
                  budgetLimits.map((bl) => {
                    const catName =
                      joinedName(bl.categories) ??
                      categories.find((c) => c.id === bl.category_id)?.name ??
                      "Categoría";

                    const limit = Number(bl.limit_cop ?? 0);
                    const spent = Number(spentByCategory[bl.category_id] ?? 0);
                    const ratio = limit > 0 ? spent / limit : 0;

                    return (
                      <div key={bl.id} className="card" style={{ padding: 12 }}>
                        <div className="row" style={{ justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontWeight: 800 }}>{catName}</div>
                            <div className="muted" style={{ marginTop: 4 }}>
                              Gastado: ${formatCOP(spent)} · Límite: ${formatCOP(limit)}
                            </div>
                          </div>
                          <div className="badge">{Math.min(100, Math.round(ratio * 100)) || 0}%</div>
                        </div>

                        <div style={{ marginTop: 10, height: 10, background: "rgba(255,255,255,.10)", borderRadius: 999 }}>
                          <div
                            style={{
                              height: 10,
                              width: `${Math.min(100, Math.round(ratio * 100))}%`,
                              borderRadius: 999,
                              background: ratio >= 1 ? "#ef4444" : ratio >= 0.8 ? "#f59e0b" : "#22c55e",
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
      </div>

      <hr />

      <div className="card">
        <div style={{ fontWeight: 900 }}>Nueva transacción</div>

        <div className="row" style={{ marginTop: 12 }}>
          <input
            value={txAmount}
            onChange={(e) => setTxAmount(e.target.value)}
            style={{ width: 180 }}
            placeholder="0"
          />

          <select value={txType} onChange={(e) => setTxType(e.target.value as any)} style={{ width: 160 }}>
            <option value="debit">Gasto</option>
            <option value="credit">Ingreso</option>
          </select>

          <select value={txCategoryId} onChange={(e) => setTxCategoryId(e.target.value)} style={{ minWidth: 240 }}>
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

        <div className="row" style={{ marginTop: 10 }}>
          <input
            value={txNote}
            onChange={(e) => setTxNote(e.target.value)}
            placeholder="Descripción (opcional)"
            style={{ flex: 1, minWidth: 260 }}
          />
          <button onClick={saveTransaction}>Guardar</button>
        </div>

        {msg && <div className="muted" style={{ marginTop: 12 }}>{msg}</div>}
      </div>

      <hr />

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900 }}>Historial</div>
          <div className="muted">Últimas 50 transacciones</div>
        </div>

        {txs.length === 0 ? (
          <div className="muted" style={{ marginTop: 10 }}>No hay transacciones.</div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
            {txs.map((t) => {
              const isCredit = t.type === "credit";
              const amt = Number(t.amount_cop ?? 0);
              const catName = joinedName(t.categories) ?? "Sin categoría";
              const dateStr = new Date(t.occurred_at).toLocaleString("es-CO");

              return (
                <div key={t.id} className="row" style={{ justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {isCredit ? "Ingreso" : "Gasto"} · {catName}
                    </div>
                    <div className="muted">{dateStr} · {t.status}</div>
                  </div>

                  <div style={{ fontWeight: 900, color: isCredit ? "#22c55e" : "#ef4444" }}>
                    {isCredit ? "+" : "-"}${formatCOP(amt)} COP
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
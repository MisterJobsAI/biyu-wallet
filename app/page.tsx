"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  categories?: { name: string } | null;
};

type Budget = {
  id: string;
  user_id: string;
  account_id: string;
  month: string; // "YYYY-MM-01"
  total_limit_cop: number | null;
};

type BudgetLimit = {
  id: string;
  budget_id: string;
  category_id: string;
  limit_cop: number;
  categories?: { name: string } | null;
};

type AlertItem = {
  key: string;
  severity: "ok" | "warning" | "danger";
  message: string;
};

type ToastKind = "success" | "info" | "warning" | "error";
type Toast = { kind: ToastKind; text: string } | null;

// -----------------------------
// THEME (magenta/morado)
// -----------------------------
const theme = {
  bg: "#F6F3FF",
  card: "#FFFFFF",
  text: "#1B1230",
  textSoft: "rgba(27, 18, 48, 0.72)",
  border: "rgba(27, 18, 48, 0.10)",
  shadow: "0 12px 30px rgba(27, 18, 48, 0.10)",
  shadow2: "0 8px 16px rgba(27, 18, 48, 0.08)",
  primary: "#7C3AED", // morado
  primary2: "#D946EF", // magenta
  primarySoft: "rgba(124, 58, 237, 0.12)",
  magentaSoft: "rgba(217, 70, 239, 0.12)",
  ok: "#22C55E",
  warn: "#F59E0B",
  danger: "#EF4444",
  okSoft: "rgba(34, 197, 94, 0.14)",
  warnSoft: "rgba(245, 158, 11, 0.16)",
  dangerSoft: "rgba(239, 68, 68, 0.14)",
  radius: 18,
  radiusSm: 14,
  inputBg: "rgba(124, 58, 237, 0.06)",
};

function formatCOP(n: number) {
  try {
    return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(
      Math.round(Number(n || 0))
    );
  } catch {
    return String(Math.round(Number(n || 0)));
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
function monthPretty(d: Date) {
  return d.toLocaleString("es-CO", { month: "long", year: "numeric" });
}

function normalizeCategories(input: Category[], uncategorizedId: string) {
  const byId = new Map<string, Category>();
  for (const c of input) if (!byId.has(c.id)) byId.set(c.id, c);

  const byName = new Map<string, Category>();
  for (const c of byId.values()) {
    const key = (c.name || "").trim().toLowerCase();
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, c);
  }

  return Array.from(byName.values()).sort((a, b) => {
    const aIsUn = a.id === uncategorizedId ? 0 : 1;
    const bIsUn = b.id === uncategorizedId ? 0 : 1;
    if (aIsUn !== bIsUn) return aIsUn - bIsUn;
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
}

function onlyDigits(s: string) {
  return (s || "").replace(/[^\d]/g, "");
}

// ✅ Emoji automático por nombre de categoría
function emojiForCategoryName(name: string) {
  const n = (name || "").toLowerCase();
  if (n.includes("arriendo") || n.includes("alquiler") || n.includes("renta")) return "🏠";
  if (n.includes("comida") || n.includes("rest") || n.includes("almuerzo") || n.includes("cena")) return "🍽️";
  if (
    n.includes("transporte") ||
    n.includes("uber") ||
    n.includes("bus") ||
    n.includes("metro") ||
    n.includes("taxi")
  )
    return "🚌";
  if (
    n.includes("servicio") ||
    n.includes("internet") ||
    n.includes("luz") ||
    n.includes("agua") ||
    n.includes("gas")
  )
    return "💡";
  if (n.includes("ocio") || n.includes("cine") || n.includes("fiesta") || n.includes("salida")) return "🎉";
  if (n.includes("salud") || n.includes("farm") || n.includes("med") || n.includes("doctor")) return "🩺";
  if (n.includes("educ") || n.includes("uni") || n.includes("libro") || n.includes("curso")) return "🎓";
  if (n.includes("ropa") || n.includes("shopping") || n.includes("compra")) return "🛍️";
  if (n.includes("sin categoría") || n.includes("sin categoria")) return "📌";
  return "🏷️";
}

function toDatetimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (x: number) => String(x).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function fromDatetimeLocalValue(v: string) {
  const d = new Date(v);
  return d.toISOString();
}

// -----------------------------
// Small UI components (same file)
// -----------------------------
function Card(props: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ ...styles.card }}>
      {(props.title || props.subtitle || props.right) && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div>
            {props.title && (
              <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: 0.2 }}>
                {props.title}
              </div>
            )}
            {props.subtitle && (
              <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft }}>
                {props.subtitle}
              </div>
            )}
          </div>
          {props.right ? <div>{props.right}</div> : null}
        </div>
      )}
      <div style={{ marginTop: props.title || props.subtitle ? 12 : 0 }}>
        {props.children}
      </div>
    </div>
  );
}

function Pill(props: { tone: "primary" | "ok" | "warn" | "danger" | "neutral"; children: React.ReactNode }) {
  const map = {
    primary: { bg: theme.primarySoft, border: "rgba(124, 58, 237, 0.25)", color: theme.primary },
    ok: { bg: theme.okSoft, border: "rgba(34,197,94,0.25)", color: theme.ok },
    warn: { bg: theme.warnSoft, border: "rgba(245,158,11,0.25)", color: theme.warn },
    danger: { bg: theme.dangerSoft, border: "rgba(239,68,68,0.25)", color: theme.danger },
    neutral: { bg: "rgba(27,18,48,0.06)", border: "rgba(27,18,48,0.10)", color: theme.textSoft },
  } as const;

  const s = map[props.tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${s.border}`,
        background: s.bg,
        color: s.color,
        fontWeight: 800,
      }}
    >
      {props.children}
    </span>
  );
}

function PrimaryButton(props: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        ...styles.btn,
        ...styles.btnPrimary,
        opacity: props.disabled ? 0.6 : 1,
      }}
    >
      {props.children}
    </button>
  );
}

function GhostButton(props: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        ...styles.btn,
        ...styles.btnGhost,
        opacity: props.disabled ? 0.6 : 1,
      }}
    >
      {props.children}
    </button>
  );
}

function DangerButton(props: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        ...styles.btn,
        ...styles.btnDanger,
        opacity: props.disabled ? 0.6 : 1,
      }}
    >
      {props.children}
    </button>
  );
}

function TextInput(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  width?: number | string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={props.type ?? "text"}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      disabled={props.disabled}
      style={{ ...styles.input, width: props.width ?? "100%" }}
    />
  );
}

function SelectInput(props: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  width?: number | string;
  disabled?: boolean;
}) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      disabled={props.disabled}
      style={{ ...styles.select, width: props.width ?? "100%" }}
    >
      {props.children}
    </select>
  );
}

function ProgressBar(props: { pct: number; tone: "neutral" | "ok" | "warn" | "danger" }) {
  const color =
    props.tone === "ok"
      ? theme.ok
      : props.tone === "warn"
      ? theme.warn
      : props.tone === "danger"
      ? theme.danger
      : "rgba(27,18,48,0.30)";
  return (
    <div style={{ height: 10, background: "rgba(27,18,48,0.08)", borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          height: 10,
          width: `${Math.min(100, Math.max(0, Math.round(props.pct)))}%`,
          background: color,
          borderRadius: 999,
        }}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: `radial-gradient(1200px 600px at 10% 0%, ${theme.magentaSoft} 0%, rgba(0,0,0,0) 60%),
                radial-gradient(900px 600px at 90% 10%, ${theme.primarySoft} 0%, rgba(0,0,0,0) 65%),
                ${theme.bg}`,
    color: theme.text,
    padding: 18,
  },
  wrap: { maxWidth: 980, margin: "0 auto" },
  header: {
    borderRadius: theme.radius,
    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary2} 100%)`,
    padding: 18,
    color: "#fff",
    boxShadow: theme.shadow,
  },
  h1: { margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: 0.2 },
  sub: { marginTop: 6, fontSize: 12, opacity: 0.92 },
  card: {
    background: theme.card,
    borderRadius: theme.radius,
    border: `1px solid ${theme.border}`,
    boxShadow: theme.shadow2,
    padding: 14,
  },
  grid3: {
    marginTop: 14,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
  },
  row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
  btn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${theme.border}`,
    cursor: "pointer",
    fontWeight: 900,
    letterSpacing: 0.2,
  },
  btnPrimary: {
    border: "none",
    color: "#fff",
    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary2} 100%)`,
    boxShadow: "0 10px 18px rgba(124,58,237,0.25)",
  },
  btnGhost: { background: "rgba(255,255,255,0.7)" },
  btnDanger: {
    border: `1px solid rgba(239,68,68,0.25)`,
    background: theme.dangerSoft,
    color: theme.danger,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${theme.border}`,
    background: theme.inputBg,
    outline: "none",
    color: theme.text,
    fontWeight: 700,
  },
  select: {
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${theme.border}`,
    background: "rgba(255,255,255,0.9)",
    outline: "none",
    color: theme.text,
    fontWeight: 800,
  },
  sectionTitle: { marginTop: 16, marginBottom: 8, fontSize: 14, fontWeight: 950 },
  hr: { margin: "16px 0", border: "none", height: 1, background: "rgba(27,18,48,0.10)" },
  small: { fontSize: 12, color: theme.textSoft },
  txItem: {
    padding: 12,
    borderRadius: theme.radiusSm,
    border: `1px solid ${theme.border}`,
    background: "rgba(255,255,255,0.7)",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10, 6, 20, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 9999,
  },
  modal: {
    width: "min(760px, 96vw)",
    background: "#fff",
    borderRadius: theme.radius,
    padding: 16,
    boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
    border: `1px solid ${theme.border}`,
  },
};

export default function Page() {
  // ✅ Tu UUID real de “Sin categoría”
  const UNCATEGORIZED_ID = "2e13320f-fdf8-44a9-96ec-482baaac8e3f";
  const APP_NAME = "BiYú";

  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = (kind: ToastKind, text: string) => {
    setToast({ kind, text });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  };

  const [userEmail, setUserEmail] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const [busy, setBusy] = useState<
    | null
    | "signin"
    | "signout"
    | "bootstrap"
    | "refresh"
    | "createAccount"
    | "saveTotal"
    | "saveCatLimit"
    | "saveTx"
    | "updateTx"
    | "deleteTx"
  >(null);

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

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => monthLabel(new Date()));
  const selectedMonth = useMemo(() => new Date(selectedMonthKey + "T00:00:00"), [selectedMonthKey]);
  const [historyMode, setHistoryMode] = useState<"month" | "last50">("month");

  const [editingTx, setEditingTx] = useState<Tx | null>(null);
  const [editAmount, setEditAmount] = useState<string>("0");
  const [editType, setEditType] = useState<"debit" | "credit">("debit");
  const [editCategoryId, setEditCategoryId] = useState<string>(UNCATEGORIZED_ID);
  const [editNote, setEditNote] = useState<string>("");
  const [editDatetimeLocal, setEditDatetimeLocal] = useState<string>(() =>
    toDatetimeLocalValue(new Date().toISOString())
  );

  const suppressAccountRefresh = useRef(false);

  const monthOptions = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: monthLabel(d), label: monthPretty(d) });
    }
    return out;
  }, []);

  const monthISOStart = useMemo(() => monthStartISO(selectedMonth), [selectedMonth]);
  const monthISONext = useMemo(() => nextMonthStartISO(selectedMonth), [selectedMonth]);

  const totalLimit = useMemo(() => Number(budget?.total_limit_cop ?? 0), [budget]);
  const totalUsagePct = useMemo(
    () => (totalLimit > 0 ? (spentTotalMonth / totalLimit) * 100 : 0),
    [spentTotalMonth, totalLimit]
  );

  // ✅ Para el mini dashboard (Top 3 categorías gastadas)
  const topCategories = useMemo(() => {
    const entries = Object.entries(spentByCategory)
      .map(([categoryId, spent]) => ({ categoryId, spent: Number(spent ?? 0) }))
      .filter((x) => x.spent > 0);

    entries.sort((a, b) => b.spent - a.spent);

    return entries.slice(0, 3).map((x) => {
      const name =
        categories.find((c) => c.id === x.categoryId)?.name ??
        (x.categoryId === UNCATEGORIZED_ID ? "Sin categoría" : "Categoría");

      const limit = Number(budgetLimits.find((l) => l.category_id === x.categoryId)?.limit_cop ?? 0);
      const pct = limit > 0 ? (x.spent / limit) * 100 : null;

      const tone: "neutral" | "ok" | "warn" | "danger" =
        !limit || limit <= 0 ? "neutral" : pct! >= 100 ? "danger" : pct! >= 80 ? "warn" : "ok";

      return { ...x, name, emoji: emojiForCategoryName(name), limit, pct, tone };
    });
  }, [spentByCategory, categories, budgetLimits, UNCATEGORIZED_ID]);

  const top1 = topCategories[0] ?? null;

  // ✅ Lista visual de límites con progreso + emoji
  const limitsView = useMemo(() => {
    const list = budgetLimits
      .map((bl) => {
        const name =
          bl.categories?.name ??
          categories.find((c) => c.id === bl.category_id)?.name ??
          "Categoría";

        const emoji = emojiForCategoryName(name);
        const limit = Number(bl.limit_cop ?? 0);
        const spent = Number(spentByCategory[bl.category_id] ?? 0);
        const pct = limit > 0 ? (spent / limit) * 100 : 0;

        const tone: "ok" | "warn" | "danger" | "neutral" =
          limit <= 0 ? "neutral" : pct >= 100 ? "danger" : pct >= 80 ? "warn" : "ok";

        const status =
          limit <= 0
            ? "Sin límite"
            : pct >= 100
            ? `Excedido (${Math.round(pct)}%)`
            : pct >= 80
            ? `Cerca (${Math.round(pct)}%)`
            : `OK (${Math.round(pct)}%)`;

        return { ...bl, name, emoji, limit, spent, pct, tone, status };
      })
      .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));

    return list;
  }, [budgetLimits, categories, spentByCategory]);

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
    if (!email.trim()) {
      showToast("warning", "Escribe tu correo antes de enviar el Magic Link.");
      return;
    }

    setBusy("signin");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
      });

      if (error) {
        showToast("error", error.message);
        return;
      }

      showToast("success", "Listo. Revisa tu correo para el Magic Link.");
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    setBusy("signout");
    try {
      await supabase.auth.signOut();
      showToast("info", "Sesión cerrada.");

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
      setEditingTx(null);
    } finally {
      setBusy(null);
    }
  };

  // -----------------------------
  // BOOTSTRAP + LOAD DATA
  // -----------------------------
  const bootstrap = async () => {
    setBusy("bootstrap");
    try {
      const { error } = await supabase.rpc("bootstrap_user");
      if (error) {
        showToast("error", error.message);
        return;
      }
      showToast("success", "Wallet creada correctamente.");
      await refreshData(true);
    } finally {
      setBusy(null);
    }
  };

  const refreshData = async (forcePickAccount = false) => {
    setBusy("refresh");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        showToast("warning", "No estás logueado.");
        return;
      }

      // cuentas
      const { data: accs, error: accErr } = await supabase
        .from("accounts")
        .select("id,user_id,name,currency")
        .order("name", { ascending: true });

      if (accErr) {
        showToast("error", `Error cargando cuentas: ${accErr.message}`);
        return;
      }

      const accList = (accs ?? []) as Account[];
      setAccounts(accList);

      let accountId = selectedAccountId;
      if (forcePickAccount || !accountId) {
        accountId = accList[0]?.id ?? "";
        if (accountId && accountId !== selectedAccountId) {
          suppressAccountRefresh.current = true;
          setSelectedAccountId(accountId);
        }
      }

      // categorías
      const { data: cats, error: catErr } = await supabase
        .from("categories")
        .select("id,user_id,name,icon")
        .order("name", { ascending: true });

      if (catErr) {
        showToast("error", `Error cargando categorías: ${catErr.message}`);
        return;
      }

      const catList = normalizeCategories((cats ?? []) as Category[], UNCATEGORIZED_ID);
      setCategories(catList);

      if (!accountId) {
        setBudget(null);
        setBudgetLimits([]);
        setTxs([]);
        setBalance(0);
        setSpentTotalMonth(0);
        setSpentByCategory({});
        setAlerts([{ key: "ok", severity: "ok", message: "No hay cuentas aún." }]);
        return;
      }

      // presupuesto del mes seleccionado
      const monthStr = monthLabel(selectedMonth);

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

      if (budErr) {
        showToast("error", `Error cargando budget: ${budErr.message}`);
        return;
      }

      const budRow = (bud ?? null) as Budget | null;
      setBudget(budRow);
      setTotalLimitInput(String(budRow?.total_limit_cop ?? 0));

      // límites
      let blList: BudgetLimit[] = [];
      if (budRow?.id) {
        const { data: bl, error: blErr } = await supabase
          .from("budget_limits")
          .select("id,budget_id,category_id,limit_cop,categories(name)")
          .eq("budget_id", budRow.id)
          .order("id", { ascending: true });

        if (blErr) {
          showToast("error", `Error cargando límites: ${blErr.message}`);
          return;
        }
        blList = (bl ?? []) as BudgetLimit[];
      }
      setBudgetLimits(blList);

      // historial
      const baseTxQuery = supabase
        .from("transactions")
        .select("id,user_id,account_id,category_id,type,amount_cop,note,occurred_at,status,created_at,categories(name)")
        .eq("account_id", accountId);

      const txQuery =
        historyMode === "month"
          ? baseTxQuery.gte("occurred_at", monthISOStart).lt("occurred_at", monthISONext)
          : baseTxQuery;

      const { data: txHist, error: txHistErr } = await txQuery
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (txHistErr) {
        showToast("error", `Error cargando transacciones: ${txHistErr.message}`);
        return;
      }
      setTxs((txHist ?? []) as Tx[]);

      // balance all-time
      const { data: txForBalance, error: balErr } = await supabase
        .from("transactions")
        .select("type,amount_cop")
        .eq("account_id", accountId);

      if (balErr) {
        showToast("error", `Error calculando balance: ${balErr.message}`);
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

      // gastado mes seleccionado
      const { data: txMonth, error: txMonthErr } = await supabase
        .from("transactions")
        .select("category_id,amount_cop,occurred_at,status")
        .eq("account_id", accountId)
        .eq("type", "debit")
        .eq("status", "posted")
        .gte("occurred_at", monthISOStart)
        .lt("occurred_at", monthISONext);

      if (txMonthErr) {
        showToast("error", `Error cargando gastado del mes: ${txMonthErr.message}`);
        return;
      }

      let totalSpent = 0;
      const byCat: Record<string, number> = {};
      for (const r of txMonth ?? []) {
        const amount = Number((r as any).amount_cop ?? 0);
        const catId = ((r as any).category_id as string | null) ?? null;

        totalSpent += amount;
        const key = catId ? catId : UNCATEGORIZED_ID;
        byCat[key] = (byCat[key] ?? 0) + amount;
      }
      setSpentTotalMonth(totalSpent);
      setSpentByCategory(byCat);

      // alertas
      const computedAlerts: AlertItem[] = [];

      const totalLim = Number(budRow?.total_limit_cop ?? 0);
      if (totalLim > 0) {
        const ratio = totalSpent / totalLim;
        if (ratio >= 1) {
          computedAlerts.push({
            key: "total-danger",
            severity: "danger",
            message: `Excediste el límite total del mes: $${formatCOP(totalSpent)} / $${formatCOP(totalLim)} COP`,
          });
        } else if (ratio >= 0.8) {
          computedAlerts.push({
            key: "total-warning",
            severity: "warning",
            message: `Cerca del límite total del mes: $${formatCOP(totalSpent)} / $${formatCOP(totalLim)} COP`,
          });
        }
      }

      for (const lim of blList) {
        const limValue = Number(lim.limit_cop ?? 0);
        if (!limValue || limValue <= 0) continue;

        const catId = lim.category_id;
        const spent = Number(byCat[catId] ?? 0);
        const ratio = spent / limValue;

        const catName =
          lim.categories?.name ??
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
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (userEmail) refreshData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  useEffect(() => {
    if (!userEmail) return;
    if (!selectedAccountId) return;

    if (suppressAccountRefresh.current) {
      suppressAccountRefresh.current = false;
      return;
    }
    refreshData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  useEffect(() => {
    if (!userEmail) return;
    refreshData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthKey, historyMode]);

  // -----------------------------
  // ACTIONS
  // -----------------------------
  const createAccount = async () => {
    const name = newAccountName.trim();
    if (!name) {
      showToast("warning", "Escribe un nombre para la cuenta.");
      return;
    }

    setBusy("createAccount");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        showToast("warning", "No logueado.");
        return;
      }

      const { error } = await supabase.from("accounts").insert({
        user_id: user.id,
        name,
        currency: "COP",
      });

      if (error) {
        showToast("error", `Error creando cuenta: ${error.message}`);
        return;
      }

      setNewAccountName("");
      showToast("success", "Cuenta creada.");
      await refreshData(true);
    } finally {
      setBusy(null);
    }
  };

  const saveTotalLimit = async () => {
    if (!budget?.id) {
      showToast("warning", "No hay presupuesto activo (ejecuta bootstrap_user()).");
      return;
    }

    const value = Number(onlyDigits(totalLimitInput) || "0");

    setBusy("saveTotal");
    try {
      const { error } = await supabase.from("budgets").update({ total_limit_cop: value }).eq("id", budget.id);

      if (error) {
        showToast("error", `Error guardando límite total: ${error.message}`);
        return;
      }

      showToast("success", "Límite total guardado.");
      await refreshData(false);
    } finally {
      setBusy(null);
    }
  };

  const saveCategoryLimit = async () => {
    if (!budget?.id) {
      showToast("warning", "No hay presupuesto activo (ejecuta bootstrap_user()).");
      return;
    }

    const catId = limitCategoryId || "";
    const limitValue = Number(onlyDigits(limitCategoryValue) || "0");

    if (!catId) {
      showToast("warning", "Selecciona una categoría.");
      return;
    }
    if (limitValue <= 0) {
      showToast("warning", "Escribe un límite mayor a 0.");
      return;
    }

    setBusy("saveCatLimit");
    try {
      const { data: existing, error: exErr } = await supabase
        .from("budget_limits")
        .select("id")
        .eq("budget_id", budget.id)
        .eq("category_id", catId)
        .maybeSingle();

      if (exErr) {
        showToast("error", `Error consultando límite: ${exErr.message}`);
        return;
      }

      if (existing?.id) {
        const { error } = await supabase.from("budget_limits").update({ limit_cop: limitValue }).eq("id", existing.id);
        if (error) {
          showToast("error", `Error actualizando límite: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase.from("budget_limits").insert({
          budget_id: budget.id,
          category_id: catId,
          limit_cop: limitValue,
        });
        if (error) {
          showToast("error", `Error creando límite: ${error.message}`);
          return;
        }
      }

      setLimitCategoryValue("0");
      showToast("success", "Límite por categoría guardado.");
      await refreshData(false);
    } finally {
      setBusy(null);
    }
  };

  const saveTransaction = async () => {
    const amount = Number(onlyDigits(txAmount) || "0");
    if (!selectedAccount) {
      showToast("warning", "No hay cuenta activa (ejecuta bootstrap_user()).");
      return;
    }
    if (amount <= 0) {
      showToast("warning", "Escribe un monto mayor a 0.");
      return;
    }

    setBusy("saveTx");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        showToast("warning", "No logueado.");
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
        showToast("error", `Error guardando transacción: ${error.message}`);
        return;
      }

      setTxAmount("0");
      setTxNote("");
      showToast("success", "Transacción guardada.");
      await refreshData(false);
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (t: Tx) => {
    setEditingTx(t);
    setEditAmount(String(Math.round(Number(t.amount_cop ?? 0))));
    setEditType(t.type);
    setEditCategoryId(t.category_id ?? UNCATEGORIZED_ID);
    setEditNote(t.note ?? "");
    setEditDatetimeLocal(toDatetimeLocalValue(t.occurred_at));
  };
  const cancelEdit = () => setEditingTx(null);

  const updateTransaction = async () => {
    if (!editingTx) return;

    const amount = Number(onlyDigits(editAmount) || "0");
    if (amount <= 0) {
      showToast("warning", "El monto debe ser mayor a 0.");
      return;
    }

    setBusy("updateTx");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        showToast("warning", "No logueado.");
        return;
      }

      const occurredAtISO = fromDatetimeLocalValue(editDatetimeLocal);
      const catId = (editCategoryId || "").trim() || UNCATEGORIZED_ID;
      const note = editNote.trim() ? editNote.trim() : null;

      const { error } = await supabase
        .from("transactions")
        .update({ amount_cop: amount, type: editType, category_id: catId, note, occurred_at: occurredAtISO })
        .eq("id", editingTx.id)
        .eq("user_id", user.id);

      if (error) {
        showToast("error", `Error actualizando: ${error.message}`);
        return;
      }

      showToast("success", "Transacción actualizada.");
      setEditingTx(null);
      await refreshData(false);
    } finally {
      setBusy(null);
    }
  };

  const deleteTransaction = async (t: Tx) => {
    const ok = window.confirm("¿Eliminar esta transacción? Esta acción no se puede deshacer.");
    if (!ok) return;

    setBusy("deleteTx");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        showToast("warning", "No logueado.");
        return;
      }

      const { error } = await supabase.from("transactions").delete().eq("id", t.id).eq("user_id", user.id);

      if (error) {
        showToast("error", `Error eliminando: ${error.message}`);
        return;
      }

      showToast("success", "Transacción eliminada.");
      await refreshData(false);
    } finally {
      setBusy(null);
    }
  };

  const isBusy = busy !== null;

  const toastBox = (() => {
    if (!toast) return null;
    const map: Record<ToastKind, { bg: string; border: string; color: string; icon: string }> = {
      success: { bg: theme.okSoft, border: "rgba(34,197,94,0.25)", color: theme.ok, icon: "✅" },
      info: { bg: theme.primarySoft, border: "rgba(124,58,237,0.25)", color: theme.primary, icon: "ℹ️" },
      warning: { bg: theme.warnSoft, border: "rgba(245,158,11,0.25)", color: theme.warn, icon: "🟠" },
      error: { bg: theme.dangerSoft, border: "rgba(239,68,68,0.25)", color: theme.danger, icon: "🔴" },
    };
    const s = map[toast.kind];
    return (
      <div style={{ marginTop: 12, padding: 12, borderRadius: theme.radiusSm, border: `1px solid ${s.border}`, background: s.bg, color: theme.text }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span>{s.icon}</span>
          <span style={{ fontWeight: 800 }}>{toast.text}</span>
        </div>
      </div>
    );
  })();

  // -----------------------------
  // RENDER
  // -----------------------------
  if (!userEmail) {
    return (
      <main style={styles.page}>
        <div style={styles.wrap}>
          <div style={styles.header}>
            <div style={styles.h1}>{APP_NAME} · Student Wallet (MVP)</div>
            <div style={styles.sub}>Control de gastos con look juvenil (magenta/morado)</div>
          </div>

          {toastBox}

          <div style={{ ...styles.card, marginTop: 14 }}>
            <div style={{ fontWeight: 950 }}>Iniciar sesión</div>
            <div style={{ marginTop: 10, ...styles.small }}>Te enviamos un Magic Link a tu correo.</div>

            <div style={{ ...styles.row, marginTop: 12 }}>
              <TextInput value={email} onChange={setEmail} placeholder="tu@email.com" width={320} disabled={isBusy} />
              <PrimaryButton onClick={signIn} disabled={isBusy}>
                {busy === "signin" ? "Enviando..." : "Entrar"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const totalTone: "neutral" | "ok" | "warn" | "danger" =
    totalLimit <= 0 ? "neutral" : totalUsagePct >= 100 ? "danger" : totalUsagePct >= 80 ? "warn" : "ok";

  return (
    <main style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.header}>
          <div style={styles.h1}>{APP_NAME} · Student Wallet (MVP)</div>
          <div style={styles.sub}>
            Hola, <b>{userEmail}</b> · Saldo simulado
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Pill tone="primary">Saldo · ${formatCOP(balance)} COP</Pill>
            <Pill tone={totalTone === "neutral" ? "neutral" : totalTone === "ok" ? "ok" : totalTone === "warn" ? "warn" : "danger"}>
              Mes · {monthPretty(selectedMonth)}
            </Pill>
          </div>
        </div>

        {toastBox}

        {/* Controls */}
        <div style={{ ...styles.card, marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <div style={styles.small}>Mes</div>
                <SelectInput value={selectedMonthKey} onChange={setSelectedMonthKey} width={240} disabled={isBusy}>
                  {monthOptions.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </SelectInput>
              </div>

              <div>
                <div style={styles.small}>Historial</div>
                <SelectInput value={historyMode} onChange={(v) => setHistoryMode(v as any)} width={200} disabled={isBusy}>
                  <option value="month">Este mes</option>
                  <option value="last50">Últimas 50</option>
                </SelectInput>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <GhostButton onClick={() => refreshData(false)} disabled={isBusy}>
                {busy === "refresh" ? "Actualizando..." : "Refrescar"}
              </GhostButton>
              <PrimaryButton onClick={bootstrap} disabled={isBusy}>
                {busy === "bootstrap" ? "Creando..." : "Bootstrap"}
              </PrimaryButton>
              <GhostButton onClick={signOut} disabled={isBusy}>
                Cerrar sesión
              </GhostButton>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={styles.grid3}>
          <Card
            title="Resumen del mes"
            subtitle={`Mes: ${monthLabel(selectedMonth)} · Gastado: $${formatCOP(spentTotalMonth)} COP`}
            right={
              <Pill tone={totalTone === "neutral" ? "neutral" : totalTone === "ok" ? "ok" : totalTone === "warn" ? "warn" : "danger"}>
                {Math.round(totalUsagePct || 0)}%
              </Pill>
            }
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={styles.small}>Presupuesto</div>
                <div style={{ fontWeight: 950 }}>
                  {totalLimit > 0 ? `$${formatCOP(totalLimit)} COP` : "No definido"}
                </div>
              </div>

              <ProgressBar pct={totalUsagePct} tone={totalTone} />

              {top1 ? (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 12, color: theme.textSoft }}>Top categoría</div>
                  <div style={{ marginTop: 6, fontWeight: 950 }}>
                    {top1.emoji} {top1.name}
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft }}>
                    Gastado: <b>${formatCOP(top1.spent)}</b> COP{" "}
                    {top1.limit > 0 ? (
                      <>
                        · Límite: <b>${formatCOP(top1.limit)}</b>
                      </>
                    ) : (
                      <>· Sin límite</>
                    )}
                  </div>
                </div>
              ) : (
                <div style={styles.small}>Aún no hay gastos en este mes.</div>
              )}
            </div>
          </Card>

          {/* ✅✅✅ MINI DASHBOARD (TOP 3) */}
          <Card title="Mini dashboard" subtitle="Tus 3 categorías con más gasto este mes">
            {topCategories.length === 0 ? (
              <div style={styles.small}>Aún no hay gastos para mostrar.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {topCategories.map((c) => {
                  const pct = c.pct ?? 0;
                  const tone = c.tone;
                  const pillTone = tone === "ok" ? "ok" : tone === "warn" ? "warn" : tone === "danger" ? "danger" : "neutral";
                  const barTone = tone;

                  return (
                    <div
                      key={c.categoryId}
                      style={{
                        border: `1px solid ${theme.border}`,
                        borderRadius: theme.radiusSm,
                        padding: 12,
                        background: "rgba(255,255,255,0.72)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 950 }}>
                            {c.emoji} {c.name}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft }}>
                            Gastado: <b>${formatCOP(c.spent)}</b>{" "}
                            {c.limit > 0 ? (
                              <>
                                · Límite: <b>${formatCOP(c.limit)}</b> · {Math.round(pct)}%
                              </>
                            ) : (
                              <>· Sin límite</>
                            )}
                          </div>
                        </div>
                        <Pill tone={pillTone}>{c.limit > 0 ? `${Math.round(pct)}%` : "Sin límite"}</Pill>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <ProgressBar pct={c.limit > 0 ? pct : 0} tone={barTone} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card title="Alertas" subtitle="Te avisamos cuando estés cerca del límite">
            <div style={{ display: "grid", gap: 10 }}>
              {alerts.map((a) => {
                const tone = a.severity === "ok" ? "ok" : a.severity === "warning" ? "warn" : "danger";
                const icon = a.severity === "ok" ? "✅" : a.severity === "warning" ? "🟠" : "🔴";
                return (
                  <div
                    key={a.key}
                    style={{
                      padding: 10,
                      borderRadius: theme.radiusSm,
                      border: `1px solid ${theme.border}`,
                      background: "rgba(255,255,255,0.65)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Pill tone={tone}>{icon}</Pill>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{a.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Cuenta y actividad" subtitle="Cambia de cuenta o crea nuevas">
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={styles.small}>Cuenta activa</div>
                {accounts.length === 0 ? (
                  <div style={{ marginTop: 8, ...styles.small }}>No hay cuentas todavía (ejecuta Bootstrap).</div>
                ) : (
                  <SelectInput value={selectedAccountId} onChange={setSelectedAccountId} width={"100%"} disabled={isBusy}>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {a.currency}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <TextInput
                  value={newAccountName}
                  onChange={setNewAccountName}
                  placeholder="Nueva cuenta (Ahorros, Efectivo, Nequi...)"
                  width={"min(520px, 100%)"}
                  disabled={isBusy}
                />
                <PrimaryButton onClick={createAccount} disabled={isBusy}>
                  {busy === "createAccount" ? "Creando..." : "Crear"}
                </PrimaryButton>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Pill tone="neutral">Historial: {historyMode === "month" ? "Este mes" : "Últimas 50"}</Pill>
                <Pill tone="neutral">Transacciones cargadas: {txs.length}</Pill>
              </div>
            </div>
          </Card>
        </div>

        <div style={styles.hr} />

        {/* Budget */}
        <div style={styles.sectionTitle}>Presupuesto</div>
        <div style={styles.grid3}>
          <Card title="Límite total del mes" subtitle="Define cuánto quieres gastar este mes">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <TextInput value={totalLimitInput} onChange={(v) => setTotalLimitInput(onlyDigits(v))} width={220} disabled={isBusy} />
              <PrimaryButton onClick={saveTotalLimit} disabled={isBusy}>
                {busy === "saveTotal" ? "Guardando..." : "Guardar"}
              </PrimaryButton>
              <Pill tone={totalTone === "neutral" ? "neutral" : totalTone === "ok" ? "ok" : totalTone === "warn" ? "warn" : "danger"}>
                Gastado: ${formatCOP(spentTotalMonth)}
              </Pill>
            </div>
          </Card>

          <Card title="Límites por categoría" subtitle="Ej: comida 300k, transporte 150k">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <SelectInput value={limitCategoryId} onChange={setLimitCategoryId} width={260} disabled={isBusy}>
                <option value="">Selecciona categoría</option>
                {categories
                  .filter((c) => c.id !== UNCATEGORIZED_ID)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {emojiForCategoryName(c.name)} {c.name}
                    </option>
                  ))}
              </SelectInput>

              <TextInput
                value={limitCategoryValue}
                onChange={(v) => setLimitCategoryValue(onlyDigits(v))}
                width={160}
                disabled={isBusy}
                placeholder="Ej: 150000"
              />

              <PrimaryButton onClick={saveCategoryLimit} disabled={isBusy}>
                {busy === "saveCatLimit" ? "Guardando..." : "Guardar"}
              </PrimaryButton>
            </div>

            <div style={{ marginTop: 10, ...styles.small }}>
              Tip: pon límites para que las alertas sean más útiles.
            </div>

            {/* Lista visual de límites */}
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {limitsView.length === 0 ? (
                <div style={{ ...styles.small }}>Aún no has creado límites por categoría.</div>
              ) : (
                limitsView.map((l) => {
                  const pillTone = l.tone === "ok" ? "ok" : l.tone === "warn" ? "warn" : l.tone === "danger" ? "danger" : "neutral";
                  const barTone = l.tone;
                  return (
                    <div
                      key={l.id}
                      style={{
                        padding: 12,
                        borderRadius: theme.radiusSm,
                        border: `1px solid ${theme.border}`,
                        background: "rgba(255,255,255,0.72)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ minWidth: 180 }}>
                          <div style={{ fontWeight: 950, fontSize: 14 }}>
                            {l.emoji} {l.name}
                          </div>
                          <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft }}>
                            Gastado: <b>${formatCOP(l.spent)}</b> · Límite: <b>${formatCOP(l.limit)}</b>
                          </div>
                        </div>

                        <Pill tone={pillTone}>{l.status}</Pill>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <ProgressBar pct={l.pct} tone={barTone} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card title="Tip rápido" subtitle="Cómo se ve una app juvenil">
            <div style={{ display: "grid", gap: 10 }}>
              <Pill tone="primary">✨ Usa el mes arriba para ver tu historial por mes</Pill>
              <Pill tone="neutral">📌 “Sin categoría” te ayuda cuando no sabes dónde clasificar</Pill>
              <Pill tone="neutral">🟠 Alertas al 80% · 🔴 al 100%</Pill>
            </div>
          </Card>
        </div>

        <div style={styles.hr} />

        {/* New transaction */}
        <div style={styles.sectionTitle}>Nueva transacción</div>
        <div style={styles.card}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <TextInput value={txAmount} onChange={(v) => setTxAmount(onlyDigits(v))} width={180} disabled={isBusy} placeholder="Monto" />

            <SelectInput value={txType} onChange={(v) => setTxType(v as any)} width={170} disabled={isBusy}>
              <option value="debit">Gasto</option>
              <option value="credit">Ingreso</option>
            </SelectInput>

            <SelectInput value={txCategoryId} onChange={setTxCategoryId} width={260} disabled={isBusy}>
              <option value={UNCATEGORIZED_ID}>📌 Sin categoría</option>
              {categories
                .filter((c) => c.id !== UNCATEGORIZED_ID)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {emojiForCategoryName(c.name)} {c.name}
                  </option>
                ))}
            </SelectInput>

            <TextInput value={txNote} onChange={setTxNote} width={"min(360px, 100%)"} disabled={isBusy} placeholder="Nota (opcional)" />

            <PrimaryButton onClick={saveTransaction} disabled={isBusy}>
              {busy === "saveTx" ? "Guardando..." : "Guardar"}
            </PrimaryButton>
          </div>
        </div>

        <div style={styles.hr} />

        {/* History */}
        <div style={styles.sectionTitle}>Historial</div>
        <div style={{ ...styles.small, marginBottom: 10 }}>
          Mostrando: <b>{historyMode === "month" ? `Este mes (${monthPretty(selectedMonth)})` : "Últimas 50"}</b>
        </div>

        {txs.length === 0 ? (
          <div style={styles.card}>
            <div style={{ fontWeight: 900 }}>No hay transacciones</div>
            <div style={{ marginTop: 8, ...styles.small }}>Crea tu primera transacción arriba 👆</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {txs.map((t) => {
              const isCredit = t.type === "credit";
              const amt = Number(t.amount_cop ?? 0);

              const catName =
                t.categories?.name ??
                categories.find((c) => c.id === t.category_id)?.name ??
                (t.category_id ? "Categoría" : "Sin categoría");

              const catEmoji = emojiForCategoryName(catName);

              const title = isCredit ? "Ingreso" : "Gasto";
              const sign = isCredit ? "+" : "-";
              const dateStr = new Date(t.occurred_at).toLocaleString("es-CO");

              return (
                <div key={t.id} style={styles.txItem}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950, fontSize: 14 }}>
                      {isCredit ? "🟣" : "🟪"} {catEmoji} {title} · {catName}
                    </div>
                    <div style={{ fontWeight: 950, color: isCredit ? theme.ok : theme.danger }}>
                      {sign}${formatCOP(amt)} COP
                    </div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, color: theme.textSoft }}>
                    {dateStr} · {t.status} {t.note ? `· ${t.note}` : ""}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <GhostButton onClick={() => openEdit(t)} disabled={isBusy}>
                      ✏️ Editar
                    </GhostButton>
                    <DangerButton onClick={() => deleteTransaction(t)} disabled={isBusy}>
                      🗑️ Eliminar
                    </DangerButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal edit */}
        {editingTx && (
          <div style={styles.modalOverlay} onClick={cancelEdit}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>Editar transacción</div>
                <GhostButton onClick={cancelEdit} disabled={isBusy}>
                  ✖
                </GhostButton>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <div style={styles.row}>
                  <div style={{ minWidth: 220 }}>
                    <div style={styles.small}>Monto</div>
                    <TextInput value={editAmount} onChange={(v) => setEditAmount(onlyDigits(v))} width={220} disabled={isBusy} />
                  </div>

                  <div style={{ minWidth: 180 }}>
                    <div style={styles.small}>Tipo</div>
                    <SelectInput value={editType} onChange={(v) => setEditType(v as any)} width={180} disabled={isBusy}>
                      <option value="debit">Gasto</option>
                      <option value="credit">Ingreso</option>
                    </SelectInput>
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={{ minWidth: 300 }}>
                    <div style={styles.small}>Categoría</div>
                    <SelectInput value={editCategoryId} onChange={setEditCategoryId} width={320} disabled={isBusy}>
                      <option value={UNCATEGORIZED_ID}>📌 Sin categoría</option>
                      {categories
                        .filter((c) => c.id !== UNCATEGORIZED_ID)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {emojiForCategoryName(c.name)} {c.name}
                          </option>
                        ))}
                    </SelectInput>
                  </div>

                  <div style={{ minWidth: 240 }}>
                    <div style={styles.small}>Fecha/hora</div>
                    <TextInput type="datetime-local" value={editDatetimeLocal} onChange={setEditDatetimeLocal} width={240} disabled={isBusy} />
                  </div>
                </div>

                <div>
                  <div style={styles.small}>Nota</div>
                  <TextInput value={editNote} onChange={setEditNote} disabled={isBusy} placeholder="Opcional" />
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <GhostButton onClick={cancelEdit} disabled={isBusy}>
                    Cancelar
                  </GhostButton>
                  <PrimaryButton onClick={updateTransaction} disabled={isBusy}>
                    {busy === "updateTx" ? "Guardando..." : "Guardar cambios"}
                  </PrimaryButton>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ height: 28 }} />
      </div>
    </main>
  );
}

import { supabase } from "@/lib/supabaseClient";
import type { DashboardSummary } from "./types";

function startOfMonthISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfDayISO(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const monthStart = startOfMonthISO(new Date());
  const day30Start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const day30StartISO = startOfDayISO(day30Start);

  const [
    accountsRes,
    monthTxRes,
    tx30Res,
    categoriesRes,
    budgetLimitsRes,
  ] = await Promise.all([
    supabase.from("accounts").select("balance").eq("user_id", userId),
    supabase
      .from("transactions")
      .select("id, created_at, amount, type, status, category_id, description")
      .eq("user_id", userId)
      .gte("created_at", monthStart),
    supabase
      .from("transactions")
      .select("created_at, amount, type, status")
      .eq("user_id", userId)
      .gte("created_at", day30StartISO),
    supabase.from("categories").select("id, name").eq("user_id", userId),
    supabase.from("budget_limits").select("category_id, limit_amount").eq("user_id", userId),
  ]);

  if (accountsRes.error) throw accountsRes.error;
  if (monthTxRes.error) throw monthTxRes.error;
  if (tx30Res.error) throw tx30Res.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (budgetLimitsRes.error) throw budgetLimitsRes.error;

  const accounts = accountsRes.data ?? [];
  const monthTx = monthTxRes.data ?? [];
  const tx30 = tx30Res.data ?? [];
  const categories = categoriesRes.data ?? [];
  const budgetLimits = budgetLimitsRes.data ?? [];

  const categoryMap = new Map<string, string>(
    categories.map((c: any) => [String(c.id), String(c.name)])
  );

  const totalBalance = accounts.reduce((sum: number, a: any) => sum + Number(a.balance ?? 0), 0);

  const monthPosted = monthTx.filter((t: any) => !t.status || t.status === "posted");

  const monthlyIncome = monthPosted
    .filter((t: any) => t.type === "income")
    .reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);

  const monthlyExpense = monthPosted
    .filter((t: any) => t.type === "expense")
    .reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0);

  // trend 30 días (gasto diario)
  const trendMap = new Map<string, number>();
  for (const t of tx30) {
    if (t.status && t.status !== "posted") continue;
    if (t.type !== "expense") continue;
    const day = String(t.created_at).slice(0, 10);
    trendMap.set(day, (trendMap.get(day) ?? 0) + Number(t.amount ?? 0));
  }
  const trend30Days = Array.from(trendMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({ date, total }));

  // breakdown por categoría (mes)
  const catAgg = new Map<string, number>();
  for (const t of monthPosted) {
    if (t.type !== "expense") continue;
    const cid = t.category_id ? String(t.category_id) : "uncategorized";
    catAgg.set(cid, (catAgg.get(cid) ?? 0) + Number(t.amount ?? 0));
  }
  const categoryBreakdown = Array.from(catAgg.entries())
    .map(([categoryId, total]) => ({
      categoryId,
      categoryName:
        categoryId === "uncategorized"
          ? "Sin categoría"
          : categoryMap.get(categoryId) ?? "Categoría",
      total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // budgets
  const spentByCat = new Map<string, number>();
  for (const t of monthPosted) {
    if (t.type !== "expense") continue;
    if (!t.category_id) continue;
    const cid = String(t.category_id);
    spentByCat.set(cid, (spentByCat.get(cid) ?? 0) + Number(t.amount ?? 0));
  }

  const budgetProgress = (budgetLimits ?? []).map((bl: any) => {
    const categoryId = String(bl.category_id);
    const limit = Number(bl.limit_amount ?? 0);
    const spent = Number(spentByCat.get(categoryId) ?? 0);
    const percentage = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

    return {
      categoryId,
      categoryName: categoryMap.get(categoryId) ?? "Categoría",
      limit,
      spent,
      percentage,
    };
  });

  const recentTransactions = [...monthTx]
    .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 10)
    .map((t: any) => ({
      id: String(t.id),
      created_at: String(t.created_at),
      amount: Number(t.amount ?? 0),
      type: t.type ?? null,
      status: t.status ?? null,
      category_id: t.category_id ?? null,
      description: t.description ?? null,
    }));

  return {
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    monthlyNet: monthlyIncome - monthlyExpense,
    trend30Days,
    categoryBreakdown,
    budgetProgress,
    recentTransactions,
  };
}
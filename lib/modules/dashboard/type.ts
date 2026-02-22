export type TrendPoint = { date: string; total: number };

export type CategoryBreakdownItem = {
  categoryId: string;
  categoryName: string;
  total: number;
};

export type BudgetProgressItem = {
  categoryId: string;
  categoryName: string;
  limit: number;
  spent: number;
  percentage: number; // 0..100
};

export type RecentTransaction = {
  id: string;
  created_at: string;
  amount: number;
  type?: string | null;
  status?: string | null;
  category_id?: string | null;
  description?: string | null;
};

export type DashboardSummary = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;

  trend30Days: TrendPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
  budgetProgress: BudgetProgressItem[];

  recentTransactions: RecentTransaction[];
};
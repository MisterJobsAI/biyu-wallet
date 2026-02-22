export type DashboardSummary = {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNet: number;
  trend30Days: { date: string; total: number }[];
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    total: number;
  }[];
  budgetProgress: {
    categoryId: string;
    categoryName: string;
    limit: number;
    spent: number;
    percentage: number;
  }[];
  recentTransactions: {
    id: string;
    created_at: string;
    amount: number;
    type?: string | null;
    status?: string | null;
    category_id?: string | null;
    description?: string | null;
  }[];
};
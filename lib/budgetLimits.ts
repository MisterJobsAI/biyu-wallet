import { supabase } from '@/lib/supabaseClient';

export type BudgetLimitRow = {
  user_id: string;
  account_id: string;
  category_id: string;
  month: string;
  limit_amount: number;
  currency?: string | null;
};

export async function getBudgetLimits(accountId: string, month: string) {
  const { data, error } = await supabase
    .from('budget_limits')
    .select('*')
    .eq('account_id', accountId)
    .eq('month', month);

  if (error) throw error;
  return data ?? [];
}

export async function upsertBudgetLimit(row: BudgetLimitRow) {
  const { data, error } = await supabase
    .from('budget_limits')
    .upsert(row, { onConflict: 'user_id,account_id,category_id,month' })
    .select('*');

  if (error) throw error;
  return data?.[0];
}
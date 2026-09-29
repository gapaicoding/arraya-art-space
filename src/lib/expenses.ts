export function sumExpenseTotal(transactions: { total: number }[]): number {
  return transactions.reduce((sum, t) => sum + t.total, 0);
}

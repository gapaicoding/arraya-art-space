export function sumSalesTotal(transactions: { total: number }[]): number {
  return transactions.reduce((sum, t) => sum + t.total, 0);
}

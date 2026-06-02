import type { Expense } from '../store/usePosStore';
import type { OperatingExpenseType } from '../store/usePosStore';
import { OPERATING_EXPENSE_LABELS } from './inventoryLabels';

export type ExpenseSummary = {
  total: number;
  inventoryTotal: number;
  operatingTotal: number;
  count: number;
  inventoryCount: number;
  operatingCount: number;
  monthTotal: number;
  monthCount: number;
  avgAmount: number;
  inventoryPct: number;
  topOperatingType: { type: OperatingExpenseType; label: string; amount: number } | null;
};

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function summarizeExpenses(expenses: Expense[]): ExpenseSummary {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let inventoryTotal = 0;
  let operatingTotal = 0;
  let inventoryCount = 0;
  let operatingCount = 0;
  let monthTotal = 0;
  let monthCount = 0;

  const operatingByType: Partial<Record<OperatingExpenseType, number>> = {};

  for (const e of expenses) {
    if (e.category === 'INVENTORY') {
      inventoryTotal += e.totalAmount;
      inventoryCount += 1;
    } else {
      operatingTotal += e.totalAmount;
      operatingCount += 1;
      if (e.operatingType) {
        operatingByType[e.operatingType] =
          (operatingByType[e.operatingType] ?? 0) + e.totalAmount;
      }
    }
    if (monthKey(e.timestamp) === currentMonth) {
      monthTotal += e.totalAmount;
      monthCount += 1;
    }
  }

  const total = inventoryTotal + operatingTotal;
  const count = expenses.length;
  const avgAmount = count > 0 ? total / count : 0;
  const inventoryPct = total > 0 ? (inventoryTotal / total) * 100 : 0;

  let topOperatingType: ExpenseSummary['topOperatingType'] = null;
  let topAmt = 0;
  for (const [type, amount] of Object.entries(operatingByType) as [
    OperatingExpenseType,
    number,
  ][]) {
    if (amount > topAmt) {
      topAmt = amount;
      topOperatingType = {
        type,
        label: OPERATING_EXPENSE_LABELS[type],
        amount,
      };
    }
  }

  return {
    total,
    inventoryTotal,
    operatingTotal,
    count,
    inventoryCount,
    operatingCount,
    monthTotal,
    monthCount,
    avgAmount,
    inventoryPct,
    topOperatingType,
  };
}

export function filterExpensesByTab(
  expenses: Expense[],
  tab: 'ALL' | 'INVENTORY' | 'OPERATING'
): Expense[] {
  if (tab === 'ALL') return expenses;
  return expenses.filter(e => e.category === tab);
}

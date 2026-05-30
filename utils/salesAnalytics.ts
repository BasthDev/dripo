import type { Category, Product, Transaction, TransactionItem } from '../store/usePosStore';
import { pickCategoryColor } from './categoryColors';

export type PeriodKey = '7d' | '30d' | '90d';

export interface DayBucket {
  label: string;
  dateKey: string;
  revenue: number;
  cogs: number;
  profit: number;
  orders: number;
}

export interface TodayStats {
  revenue: number;
  cogs: number;
  profit: number;
  marginPct: number;
  orders: number;
  itemsSold: number;
  avgOrder: number;
}

export function getItemUnitCost(
  item: TransactionItem,
  products: Product[],
  getRecipeCost: (recipeId: string) => number
): number {
  if (item.cost != null && !Number.isNaN(item.cost)) {
    return item.cost;
  }
  const product = products.find(p => p.id === item.productId);
  if (!product) return 0;
  if (product.useHpp && product.hppId) return getRecipeCost(product.hppId);
  return product.buyPrice || 0;
}

export function getTransactionCogs(
  tx: Transaction,
  products: Product[],
  getRecipeCost: (recipeId: string) => number
): number {
  return tx.items.reduce((sum, item) => {
    if (item.status === 'CANCELED') return sum;
    const unitCost = getItemUnitCost(item, products, getRecipeCost);
    return sum + unitCost * (item.quantity || 0);
  }, 0);
}

export function computeTodayStats(
  transactions: Transaction[],
  products: Product[],
  getRecipeCost: (recipeId: string) => number
): TodayStats {
  const today = new Date().toISOString().split('T')[0];
  const todayTxs = transactions.filter(
    t => t.timestamp.startsWith(today) && t.status !== 'CANCELED'
  );

  let revenue = 0;
  let cogs = 0;
  let itemsSold = 0;

  todayTxs.forEach(tx => {
    revenue += tx.totalAmount || 0;
    cogs += getTransactionCogs(tx, products, getRecipeCost);
    tx.items.forEach(item => {
      if (item.status !== 'CANCELED') itemsSold += item.quantity || 0;
    });
  });

  const profit = revenue - cogs;
  const orders = todayTxs.length;

  return {
    revenue,
    cogs,
    profit,
    marginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
    orders,
    itemsSold,
    avgOrder: orders > 0 ? revenue / orders : 0,
  };
}

function periodDays(period: PeriodKey): number {
  if (period === '7d') return 7;
  if (period === '30d') return 30;
  return 90;
}

export function buildDailyBuckets(
  transactions: Transaction[],
  products: Product[],
  getRecipeCost: (recipeId: string) => number,
  period: PeriodKey
): DayBucket[] {
  const days = periodDays(period);
  const buckets: DayBucket[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const label =
      days <= 7
        ? d.toLocaleDateString(undefined, { weekday: 'short' })
        : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

    const dayTxs = transactions.filter(
      t => t.timestamp.startsWith(dateKey) && t.status !== 'CANCELED'
    );

    let revenue = 0;
    let cogs = 0;
    dayTxs.forEach(tx => {
      revenue += tx.totalAmount || 0;
      cogs += getTransactionCogs(tx, products, getRecipeCost);
    });

    buckets.push({
      label,
      dateKey,
      revenue,
      cogs,
      profit: revenue - cogs,
      orders: dayTxs.length,
    });
  }

  return buckets;
}

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

export function buildCategoryBreakdown(
  transactions: Transaction[],
  categories: Category[] = []
): CategorySlice[] {
  const map: Record<string, number> = {};
  const colorByName = Object.fromEntries(categories.map(c => [c.name, c.color]));

  transactions.forEach(tx => {
    if (tx.status === 'CANCELED') return;
    tx.items.forEach(item => {
      if (item.status === 'CANCELED') return;
      const cat = item.categoryName || 'Uncategorized';
      map[cat] = (map[cat] || 0) + item.quantity * item.sellPrice;
    });
  });

  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value], i) => ({
      name,
      value,
      color:
        colorByName[name] ??
        pickCategoryColor(i + categories.length),
    }));
}

export function formatRpShort(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
}

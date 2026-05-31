import type { MovementReason } from '../store/usePosStore';
import type { OperatingExpenseType } from '../store/usePosStore';

export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  INITIAL: 'Initial stock',
  MANUAL_ADJUSTMENT: 'Manual adjustment',
  PURCHASE: 'Stock in / Purchase',
  SALE: 'Sale',
  VOID_ORDER: 'Void order',
  VOID_ITEM: 'Void item',
  STOCK_OPNAME: 'Stock opname',
  WASTE: 'Waste / spoilage',
};

export const OPERATING_EXPENSE_LABELS: Record<OperatingExpenseType, string> = {
  RENT: 'Rent',
  UTILITIES: 'Utilities',
  SALARY: 'Salary & wages',
  MARKETING: 'Marketing',
  MAINTENANCE: 'Maintenance',
  SUPPLIES: 'Office & supplies',
  OTHER: 'Other operating',
};

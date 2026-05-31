import type { CartItem } from '../store/useCartStore';
import {
  createDefaultPrinterStations,
  type PrinterStation,
  type PrinterStationId,
  usePosStore,
} from '../store/usePosStore';
import { getAppliedModifierLabels } from './modifierUtils';
import {
  printKitchenTicketOnDevice,
  printReceiptOnDevice,
  type KitchenTicketPayload,
} from './bluetoothPrinter';
import { enqueuePrint } from './printQueue';
import { stationMatchesCategory, stationReadyToPrint } from './printerStation';

export type ReceiptTx = {
  id: string;
  timestamp?: string;
  paymentMethod?: string;
  totalAmount: number;
  cashGiven?: number;
  change?: number;
  orderNote?: string;
  items: {
    productId?: string;
    name: string;
    quantity: number;
    sellPrice: number;
    status?: string;
    note?: string;
    categoryName?: string;
    appliedModifiers?: { id: string; name: string; sellPriceDelta: number }[];
  }[];
  tableName?: string;
  zone?: string;
  documentNo?: string;
};

export type TablePrintMeta = {
  tableName: string;
  zone: string;
  documentNo: string;
  orderNote?: string;
};

function stations(): PrinterStation[] {
  const { printerStations } = usePosStore.getState();
  return printerStations?.length ? printerStations : createDefaultPrinterStations();
}

function resolveItemCategoryId(item: {
  productId?: string;
  categoryName?: string;
}): string | undefined {
  if (item.productId) {
    return usePosStore.getState().products.find(p => p.id === item.productId)?.categoryId;
  }
  if (item.categoryName) {
    return usePosStore
      .getState()
      .categories.find(c => c.name === item.categoryName)?.id;
  }
  return undefined;
}

function activeStations(predicate: (s: PrinterStation) => boolean): PrinterStation[] {
  return stations().filter(s => stationReadyToPrint(s) && predicate(s));
}

function filterTxForStation(tx: ReceiptTx, station: PrinterStation): ReceiptTx | null {
  if (!station.categoryIds.length) return null;

  const items = tx.items.filter(item => {
    if (item.status === 'CANCELED') return false;
    return stationMatchesCategory(station, resolveItemCategoryId(item));
  });

  if (!items.length) return null;

  const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.sellPrice, 0);
  return { ...tx, items, totalAmount };
}

function queuePrintOnDevice(
  station: PrinterStation,
  run: (address: string) => Promise<boolean>
): void {
  enqueuePrint(station.label, async () => {
    await run(station.device!.address);
  });
}

function buildKitchenTicket(items: CartItem[], meta: TablePrintMeta): KitchenTicketPayload {
  const { modifiers, categories } = usePosStore.getState();
  return {
    tableName: meta.tableName,
    zone: meta.zone,
    documentNo: meta.documentNo,
    orderNote: meta.orderNote,
    timestamp: new Date().toISOString(),
    lines: items.map(item => {
      const modifierLabels = getAppliedModifierLabels(item.modifierIds ?? [], modifiers);
      const category = categories.find(c => c.id === item.product.categoryId);
      return {
        name: item.product.name,
        quantity: item.quantity,
        note: item.note,
        modifiers: modifierLabels.map(m => m.name),
        categoryName: category?.name,
      };
    }),
  };
}

export type TableKitchenPrintMode = 'first' | 'add';

/** Kitchen/bar slip on table save — not used for payment. */
export function dispatchTableKitchenPrint(
  items: CartItem[],
  meta: TablePrintMeta,
  mode: TableKitchenPrintMode
): void {
  if (!items.length) return;

  const { storeSettings } = usePosStore.getState();
  const predicate =
    mode === 'first'
      ? (s: PrinterStation) => s.printOnTableFirstOrder
      : (s: PrinterStation) => s.printOnTableAddItems;

  for (const station of activeStations(predicate)) {
    const filteredItems = items.filter(i =>
      stationMatchesCategory(station, i.product.categoryId)
    );
    if (!filteredItems.length) continue;

    const ticket = buildKitchenTicket(filteredItems, meta);
    queuePrintOnDevice(station, address =>
      printKitchenTicketOnDevice(address, ticket, storeSettings)
    );
  }
}

export function dispatchTableKitchenReprint(items: CartItem[], meta: TablePrintMeta): void {
  dispatchTableKitchenPrint(items, meta, 'first');
}

/** Full customer receipt (original format) — payment only. */
export function dispatchPaymentPrint(tx: ReceiptTx): void {
  const { storeSettings } = usePosStore.getState();
  for (const station of activeStations(s => s.printOnPayment)) {
    const filtered = filterTxForStation(tx, station);
    if (!filtered) continue;
    queuePrintOnDevice(station, address =>
      printReceiptOnDevice(address, filtered, storeSettings)
    );
  }
}

export function dispatchReprint(tx: ReceiptTx, stationId?: PrinterStationId): void {
  const { storeSettings } = usePosStore.getState();
  const targets = stationId
    ? stations().filter(s => s.id === stationId && stationReadyToPrint(s))
    : activeStations(s => s.printOnPayment);

  for (const station of targets) {
    const filtered = filterTxForStation(tx, station);
    if (!filtered) continue;
    queuePrintOnDevice(station, address =>
      printReceiptOnDevice(address, filtered, storeSettings)
    );
  }
}

export function hasAnyPrinterConfigured(): boolean {
  return stations().some(stationReadyToPrint);
}

export function getPrimaryPrinterDevice(): PrinterStation | null {
  return stations().find(stationReadyToPrint) ?? null;
}

export { stationMatchesCategory, stationReadyToPrint } from './printerStation';

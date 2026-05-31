/**
 * Serializes Bluetooth print jobs so only one printer is active at a time.
 */

let chain: Promise<void> = Promise.resolve();
let pendingCount = 0;
let queueListeners: Array<(pending: number) => void> = [];
let toastListeners: Array<(printerName: string | null) => void> = [];

export function getPrintQueuePending(): number {
  return pendingCount;
}

export function subscribePrintQueue(listener: (pending: number) => void): () => void {
  queueListeners.push(listener);
  listener(pendingCount);
  return () => {
    queueListeners = queueListeners.filter(l => l !== listener);
  };
}

/** Shows "{name} - printing" while a job runs. */
export function subscribePrintToast(listener: (printerName: string | null) => void): () => void {
  toastListeners.push(listener);
  listener(getActivePrintName());
  return () => {
    toastListeners = toastListeners.filter(l => l !== listener);
  };
}

let activePrintName: string | null = null;

export function getActivePrintName(): string | null {
  return activePrintName;
}

function notifyQueue() {
  for (const l of queueListeners) l(pendingCount);
}

function notifyToast() {
  for (const l of toastListeners) l(activePrintName);
}

function setActivePrinter(name: string | null) {
  activePrintName = name;
  notifyToast();
}

/**
 * Queue a print job. Use the station display name (e.g. Bar, Kitchen, Cashier).
 */
export function enqueuePrint(printerName: string, job: () => Promise<void>): void {
  pendingCount += 1;
  notifyQueue();
  chain = chain
    .then(async () => {
      setActivePrinter(printerName);
      try {
        await job();
      } catch (e) {
        console.error(`[PrintQueue] Job failed (${printerName}):`, e);
      }
    })
    .finally(() => {
      pendingCount = Math.max(0, pendingCount - 1);
      if (pendingCount === 0) {
        setActivePrinter(null);
      }
      notifyQueue();
    });
}

export async function flushPrintQueue(): Promise<void> {
  await chain;
}

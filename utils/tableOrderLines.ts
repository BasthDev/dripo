import type { TableOrderLine } from '../store/usePosStore';

function tableLineKey(line: TableOrderLine): string {
  const mods = (line.modifierIds ?? []).slice().sort().join(',');
  const note = (line.note ?? '').trim();
  return `${line.productId}|${mods}|${note}`;
}

/** Merge incoming lines into existing — same product/modifiers/note adds qty. */
export function mergeTableOrderLines(
  existing: TableOrderLine[],
  incoming: TableOrderLine[]
): TableOrderLine[] {
  const merged = existing.map(line => ({ ...line }));

  for (const line of incoming) {
    const key = tableLineKey(line);
    const matchIdx = merged.findIndex(l => tableLineKey(l) === key);
    if (matchIdx >= 0) {
      merged[matchIdx] = {
        ...merged[matchIdx],
        quantity: merged[matchIdx].quantity + line.quantity,
      };
    } else {
      merged.push({ ...line });
    }
  }

  return merged.filter(l => l.quantity > 0);
}

/**
 * Newest-first guard for list endpoints that document no `sort` parameter and no default order.
 *
 * A poll trigger on such a list must never seed or emit from a page that is not newest-first:
 * with an ascending default the first page would be the oldest records and the trigger would go
 * silent. A page whose `createdAt` values are not non-increasing (or cannot be read) throws.
 */
export function assertNewestFirst(items: unknown[], what: string): unknown[] {
  let previous = Number.POSITIVE_INFINITY;
  for (const item of items) {
    const raw = (item as { createdAt?: unknown } | null)?.createdAt;
    const time = typeof raw === "string" ? Date.parse(raw) : Number.NaN;
    if (Number.isNaN(time)) {
      throw new Error(
        `Mollie ${what}: a record has no readable createdAt, so the list order cannot be verified`,
      );
    }
    if (time > previous) {
      throw new Error(
        `Mollie ${what}: the list is not newest-first (createdAt increases), so polling it would miss new records`,
      );
    }
    previous = time;
  }
  return items;
}

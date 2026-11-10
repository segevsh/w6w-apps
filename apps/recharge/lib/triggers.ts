import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { walkTrigger } from "./walk.ts";

const LIMIT = 100;
type Row = { id?: unknown; created_at?: unknown; updated_at?: unknown };

export interface SinceSpec {
  key: string;
  title: string;
  description: string;
  /** The EXISTING list action (`items` / `nextCursor` result). */
  action: ActionDefinition<never>;
  /** Which stamp the vendor filter and the dedupe use. */
  stamp: "created" | "updated";
  output: OutputField[];
  sample: unknown;
}

/**
 * Recharge list endpoints (`GET /customers`, `/addresses`, `/subscriptions`, `/onetimes`, `/discounts`,
 * `/charges`) take `created_at_min` / `updated_at_min`, order by ascending id and page with
 * `next_cursor`: the since-filter shape. `stamp: "created"` filters by `created_at_min` and dedupes by id;
 * `stamp: "updated"` filters by `updated_at_min` and dedupes by `id:updated_at`, so an edit is a new event.
 * Both drop records stamped before the first check and resume a window longer than five pages.
 */
export function rechargeSince(spec: SinceSpec): TriggerDefinition {
  const field = spec.stamp === "created" ? "created_at" : "updated_at";
  const filterKey = spec.stamp === "created" ? "createdAtMin" : "updatedAtMin";
  return walkTrigger({
    key: spec.key,
    title: spec.title,
    description: spec.description,
    action: spec.action,
    first: ({ sinceMs }) => ({ [filterKey]: new Date(sinceMs).toISOString(), limit: LIMIT }),
    next: (_req, result) => {
      const cursor = (result as { nextCursor?: string }).nextCursor;
      return cursor ? { limit: LIMIT, cursor } : undefined;
    },
    items: (result) => (result as { items?: unknown[] }).items ?? [],
    idOf: (item) =>
      spec.stamp === "created"
        ? String((item as Row).id ?? "")
        : `${(item as Row).id}:${(item as Row).updated_at}`,
    stampOf: (item) => {
      const t = Date.parse(String((item as Row)[field] ?? ""));
      return Number.isFinite(t) ? t : undefined;
    },
    output: spec.output,
    sample: spec.sample,
  });
}

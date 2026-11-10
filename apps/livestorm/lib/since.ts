import type {
  ActionDefinition,
  HookContext,
  OutputField,
  Param,
  TriggerDefinition,
} from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Page size requested from the wrapped list action. */
export const PAGE_SIZE = 100;
/** Per-check ceiling: 5 pages of PAGE_SIZE. More changes than that in one interval are not all seen. */
export const MAX_PAGES = 5;
export const MAX_EVENTS = 500;
/** At least MAX_EVENTS + one page, so an overlap re-list never evicts an id emitted last check. */
export const SEEN_WINDOW = 600;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

/** The kit's ids envelope plus the epoch millisecond of the last successful check. */
export interface SinceState {
  v: 1;
  kind: "ids";
  seeded: true;
  ids: string[];
  cursor: number;
}

export interface SinceSpec<P> {
  key: string;
  title: string;
  description: string;
  /** The EXISTING list action; its `execute` is called with `request(...)`. */
  action: ActionDefinition<never>;
  /** Index of the vendor's first page (0 or 1). */
  firstPage: number;
  /** The action input for one page; `sinceMs` is already `cursor - OVERLAP_MS`. */
  request(
    o: { sinceMs: number; page: number; pageSize: number; params: P; last?: unknown },
  ): Record<string, unknown>;
  /** The page's records; `sinceMs` lets a feed drop edited-but-not-new rows. */
  items(result: unknown, sinceMs: number): unknown[];
  /** Whether another page follows; default: this page was full. */
  more?(result: unknown, got: unknown[]): boolean;
  idOf(item: unknown): string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  minIntervalMs?: number;
}

/**
 * Shape (b): the wrapped list action filters by a created/updated-after stamp but has no
 * newest-first order. Each check asks for `cursor - OVERLAP_MS`, pages through the filtered set and
 * dedupes by id with `pollNewItems`. The first check records the cursor and emits nothing.
 */
export function sinceTrigger<P>(spec: SinceSpec<P>): TriggerDefinition<P> {
  if (spec.action.type !== "read" && spec.action.type !== "search") {
    throw new Error(
      `trigger "${spec.key}": action "${spec.action.key}" has type "${spec.action.type}"; ` +
        `only "read" or "search" actions may back a poll trigger`,
    );
  }
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: spec.minIntervalMs ?? 300_000,
    async poll({ params, state }, ctx: HookContext) {
      const checkedAt = clock.now();
      const prior = state as { cursor?: unknown } | null;
      const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
      const { events, nextState } = await pollNewItems<unknown>({
        state,
        maxPages: 1,
        maxEvents: MAX_EVENTS,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        async fetchPage() {
          const items: unknown[] = [];
          let last: unknown;
          for (let n = 0; n < MAX_PAGES; n++) {
            const result = await (spec.action.execute as (i: unknown, c: HookContext) => unknown)(
              spec.request({
                sinceMs: cursor - OVERLAP_MS,
                page: spec.firstPage + n,
                pageSize: PAGE_SIZE,
                params: params as P,
                last,
              }),
              ctx,
            );
            const got = spec.items(result, cursor - OVERLAP_MS);
            items.push(...got);
            if (!(spec.more ? spec.more(result, got) : got.length >= PAGE_SIZE)) break;
            last = result;
          }
          return { items };
        },
      });
      return { events, nextState: { ...nextState, cursor: checkedAt } as SinceState };
    },
  };
}

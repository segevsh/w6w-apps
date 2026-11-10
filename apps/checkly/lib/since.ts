import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Pages walked per check; `MAX_ITEMS` is `MAX_PAGES` full pages, so a check never emits a partial window. */
export const MAX_PAGES = 1;
export const MAX_ITEMS = 1000;
export const SEEN_WINDOW = 2000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface SinceSpec<T, P = Record<string, unknown>> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** One page of records at or after `sinceMs` (epoch ms); `more` is true when another page follows. */
  fetchPage(
    sinceMs: number,
    page: number,
    ctx: HookContext,
    params: P,
  ): Promise<{ items: T[]; more: boolean }>;
  idOf(item: T): string;
  /**
   * Creation time of a record (epoch ms), when it has one. The first check then stores
   * `floor = now` and every later check drops records created before it (brief 9.9), so nothing
   * that existed before the seed is ever emitted, however the window is paged. Omit for none.
   */
  createdAtOf?(item: T): number | undefined;
}

/**
 * Since-filter poll (brief 9.1 b): list records changed since `cursor - overlap` with the app's
 * own list action, dedupe by id with `pollNewItems`. The first check records the cursor and the
 * ids in the window and emits nothing. A window longer than `MAX_PAGES` pages is cut at the cap
 * with a warning (holding the cursor back would re-list the same capped pages forever).
 */
export function sinceTrigger<T, P = Record<string, unknown>>(
  spec: SinceSpec<T, P>,
): TriggerDefinition<P> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const checkedAt = clock.now();
      const prior = state as { cursor?: unknown } | null;
      const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
      const floor = typeof (prior as { floor?: unknown } | null)?.floor === "number"
        ? (prior as { floor: number }).floor
        : checkedAt;
      let truncated = false;
      const { events, nextState } = await pollNewItems<T>({
        state,
        maxPages: 1,
        maxEvents: MAX_ITEMS,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        async fetchPage() {
          const items: T[] = [];
          for (let page = 1; page <= MAX_PAGES; page++) {
            const res = await spec.fetchPage(cursor - OVERLAP_MS, page, ctx, params);
            items.push(...res.items.filter((item) => {
              const at = spec.createdAtOf?.(item);
              return at === undefined || Number.isNaN(at) || at >= floor;
            }));
            if (!res.more) return { items };
          }
          truncated = true;
          return { items };
        },
      });
      if (truncated) {
        // Holding the cursor back would re-list the same capped pages forever, so move on and say so.
        ctx.log(
          "warn",
          `${spec.key}: more than ${MAX_ITEMS} records in the window; the rest are skipped`,
        );
      }
      return {
        events,
        nextState: spec.createdAtOf
          ? { ...nextState, cursor: checkedAt, floor }
          : { ...nextState, cursor: checkedAt },
      };
    },
  };
}

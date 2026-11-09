import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** Pages walked per check; `MAX_ITEMS` is `MAX_PAGES` full pages, so a check never emits a partial window. */
export const MAX_PAGES = 10;
export const MAX_ITEMS = 500;
export const SEEN_WINDOW = 1000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface SinceSpec<T> {
  key: string;
  title: string;
  description: string;
  output: OutputField[];
  sample: unknown;
  /** One page of records at or after `sinceMs` (epoch ms); `more` is true when another page follows. */
  fetchPage(
    sinceMs: number,
    page: number,
    ctx: HookContext,
  ): Promise<{ items: T[]; more: boolean }>;
  idOf(item: T): string;
}

/**
 * Since-filter poll (brief 9.1 b): list records changed since `cursor - overlap` with the app's
 * own list action, dedupe by id with `pollNewItems`. The first check records the cursor and the
 * ids in the window and emits nothing. A window longer than `MAX_PAGES` pages is cut at the cap
 * with a warning (holding the cursor back would re-list the same capped pages forever).
 */
export function sinceTrigger<T>(spec: SinceSpec<T>): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const checkedAt = clock.now();
      const prior = state as { cursor?: unknown } | null;
      const cursor = typeof prior?.cursor === "number" ? prior.cursor : checkedAt;
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
            const res = await spec.fetchPage(cursor - OVERLAP_MS, page, ctx);
            items.push(...res.items);
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
      return { events, nextState: { ...nextState, cursor: checkedAt } };
    },
  };
}

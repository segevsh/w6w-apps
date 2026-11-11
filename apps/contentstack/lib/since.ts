import type { HookContext, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";

/** Look-back before the previous check, so a record that lands late is still seen. */
export const OVERLAP_MS = 120_000;
/** A trigger that was stopped for a long time looks back at most this far. */
export const MAX_LOOKBACK_MS = 7 * 24 * 3_600_000;
/** Events one check may emit; the rest of the window is drained by the following checks. */
export const MAX_ITEMS = 500;
/** Ids remembered. Larger than any window a check reads, so a held window never re-emits. */
export const SEEN_WINDOW = 10_000;

/** Clock seam. Tests replace `clock.now`; the host has no clock in `ctx`. */
export const clock = { now: (): number => Date.now() };

export interface SinceSpec<T, P = Record<string, unknown>> {
  key: string;
  title: string;
  description: string;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
  /** Every record at or after `sinceMs` (epoch ms), paged to the end by the caller's own pager. */
  fetchWindow(sinceMs: number, ctx: HookContext, params: P): Promise<T[]>;
  idOf(item: T): string;
  /** The record's own creation (or update) time in epoch ms; undefined when it has none. */
  timeOf(item: T): number | undefined;
}

interface SinceState {
  cursor?: unknown;
  floor?: unknown;
  ids?: unknown;
  seeded?: unknown;
}

/**
 * Since-filter poll (brief 9.1 b, 9.8, 9.9). The first check stores `floor = cursor = now` and
 * reads nothing. Every later check lists the window `cursor - overlap`, drops records whose own
 * time is before `floor` (so nothing that existed before the seed is ever emitted), dedupes by id
 * and emits the OLDEST `MAX_ITEMS` unseen. While unseen records remain the cursor is held, so the
 * next check re-reads the same window and continues; it advances only once the window is drained.
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
      const prior = state as SinceState | null;
      if (
        !prior || prior.seeded !== true || typeof prior.cursor !== "number" ||
        typeof prior.floor !== "number"
      ) {
        return {
          events: [],
          nextState: {
            v: 1,
            kind: "ids",
            seeded: true,
            ids: [],
            cursor: checkedAt,
            floor: checkedAt,
          },
        };
      }
      const floor = prior.floor;
      const since = Math.max(prior.cursor - OVERLAP_MS, checkedAt - MAX_LOOKBACK_MS);
      const window = (await spec.fetchWindow(since, ctx, params))
        .filter((item) => {
          const at = spec.timeOf(item);
          return at === undefined || Number.isNaN(at) || at >= floor;
        })
        .map((item, index) => ({ item, index, at: spec.timeOf(item) ?? 0 }))
        .sort((a, b) => a.at - b.at || b.index - a.index)
        .map((entry) => entry.item);
      const seen = new Set(Array.isArray(prior.ids) ? (prior.ids as unknown[]).map(String) : []);
      const unseen = window.filter((item) => !seen.has(spec.idOf(item))).length;
      const { events, nextState } = await pollNewItems<T>({
        state: { v: 1, kind: "ids", seeded: true, ids: [...seen] },
        maxPages: 1,
        maxEvents: MAX_ITEMS,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        fetchPage: () => Promise.resolve({ items: [...window].reverse() }),
      });
      const drained = unseen <= MAX_ITEMS;
      return {
        events,
        nextState: { ...nextState, cursor: drained ? checkedAt : prior.cursor, floor },
      };
    },
  };
}

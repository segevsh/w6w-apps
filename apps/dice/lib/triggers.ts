import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";

type PollCtx = Parameters<NonNullable<TriggerDefinition["poll"]>>[1];

/** Overridable in tests so a check runs at a fixed instant. */
export const clock = { now: (): number => Date.now() };

/** Each check re-reads this much history, so a record stamped late is still picked up. */
export const OVERLAP_MS = 120_000;
const MAX_EVENTS = 100;
/** Ids remembered across checks; must cover one fetch (pages x page size) plus held re-reads. */
const SEEN_WINDOW = 1000;

/** One bounded read of a window: its items, and `next` (opaque resume position) while more remain. */
export interface SinceBatch {
  items: unknown[];
  next?: string;
}

export interface SinceSpec<P> {
  key: string;
  title: string;
  description: string;
  params?: TriggerDefinition["params"];
  output: NonNullable<TriggerDefinition["output"]>;
  sample: unknown;
  /**
   * Runs the wrapped list action with its created-after filter set to `since` (ISO 8601), starting
   * at `at` (the `next` the previous batch returned; undefined at the window's start). It reads at
   * most a few pages per call and returns `next` when the window holds more (brief §9.8).
   */
  load(since: string, params: P, ctx: PollCtx, at?: string): Promise<SinceBatch>;
  idOf(item: unknown): string;
  /** The item's creation time in epoch ms (used to put the page newest-first). */
  stampOf(item: unknown): number;
}

/**
 * Since-filter poll (brief §9.1 b): the wrapped list action is called with its created-after
 * filter at `cursor − overlap`; ids dedupe the overlap. The first check only records.
 */
export function sinceTrigger<P = Record<string, unknown>>(spec: SinceSpec<P>): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ params, state }, ctx) {
      const checkedAt = clock.now();
      const prior = state as { cursor?: unknown; resume?: unknown };
      const cursor = typeof prior.cursor === "number" ? prior.cursor : checkedAt;
      const r = prior.resume as { since?: unknown; at?: unknown } | undefined;
      const resume = typeof prior.cursor === "number" && r && typeof r.since === "string" &&
          typeof r.at === "string"
        ? { since: r.since, at: r.at }
        : undefined;
      // A window wider than one check's pages is walked across checks from a persisted position
      // (§9.8); its `since` stays fixed and the cursor moves only once the window is drained.
      const since = resume?.since ?? new Date(cursor - OVERLAP_MS).toISOString();
      const batch = await spec.load(since, params as P, ctx, resume?.at);
      const items = batch.items.map((item, index) => ({ item, index }))
        .sort((a, b) => spec.stampOf(b.item) - spec.stampOf(a.item) || a.index - b.index)
        .map((entry) => entry.item);
      const polled = await pollNewItems({
        state,
        maxPages: 1,
        maxEvents: MAX_EVENTS,
        seenWindow: SEEN_WINDOW,
        idOf: spec.idOf,
        fetchPage: () => Promise.resolve({ items }),
      });
      const seen = new Set(
        Array.isArray((state as { ids?: unknown }).ids)
          ? (state as { ids: unknown[] }).ids.map(String)
          : [],
      );
      const unseen = new Set(items.map((item) => spec.idOf(item)).filter((id) => !seen.has(id)));
      const held = typeof prior.cursor === "number" && unseen.size > polled.events.length;
      let tail: { cursor: number; resume?: { since: string; at: string } };
      if (held) {
        // Unemitted items remain in this read: re-read the same position next check.
        tail = { cursor, ...(resume ? { resume } : {}) };
      } else if (batch.next !== undefined && typeof prior.cursor === "number") {
        tail = { cursor, resume: { since, at: batch.next } };
      } else {
        tail = { cursor: checkedAt };
      }
      return { ...polled, nextState: { ...polled.nextState, ...tail } };
    },
  };
}

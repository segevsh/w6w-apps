import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";

type PollCtx = Parameters<NonNullable<TriggerDefinition["poll"]>>[1];

/** Overridable in tests so a check runs at a fixed instant. */
export const clock = { now: (): number => Date.now() };

/** Each check re-reads this much history, so a record stamped late is still picked up. */
export const OVERLAP_MS = 120_000;
const MAX_EVENTS = 100;

export interface SinceSpec<P> {
  key: string;
  title: string;
  description: string;
  params?: TriggerDefinition["params"];
  output: NonNullable<TriggerDefinition["output"]>;
  sample: unknown;
  /** Runs the wrapped list action with its created-after filter set to `since` (ISO 8601). */
  load(since: string, params: P, ctx: PollCtx): Promise<unknown[]>;
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
      const prior = state as { cursor?: unknown };
      const cursor = typeof prior.cursor === "number" ? prior.cursor : checkedAt;
      const fetched = await spec.load(
        new Date(cursor - OVERLAP_MS).toISOString(),
        params as P,
        ctx,
      );
      const items = fetched.map((item, index) => ({ item, index }))
        .sort((a, b) => spec.stampOf(b.item) - spec.stampOf(a.item) || a.index - b.index)
        .map((entry) => entry.item);
      const polled = await pollNewItems({
        state,
        maxPages: 1,
        maxEvents: MAX_EVENTS,
        idOf: spec.idOf,
        fetchPage: () => Promise.resolve({ items }),
      });
      // A full batch may hide more unseen records: keep the cursor so the next check re-reads them.
      const cursorNext = polled.events.length >= MAX_EVENTS ? cursor : checkedAt;
      return { ...polled, nextState: { ...polled.nextState, cursor: cursorNext } };
    },
  };
}

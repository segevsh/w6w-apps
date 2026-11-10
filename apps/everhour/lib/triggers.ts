import type { HookContext, OutputField, ParamDefinition, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** What every Everhour list action answers (`EverhourClient.many`). */
export interface ListPage {
  items: unknown[];
  nextPage: number | null;
}

export interface SnapshotSpec {
  key: string;
  title: string;
  description: string;
  params?: ParamDefinition[];
  output: OutputField[];
  sample: unknown;
  /** Reads ONE page of the wrapped list action (page 1 when `page` is undefined). */
  read(params: Record<string, unknown>, page: number, ctx: HookContext): Promise<unknown> | unknown;
  /** The record's stable key within one check. */
  keyOf(item: unknown): string;
  /** Pages read per check; a collection longer than that fails the check loudly. */
  maxPages?: number;
  /** The noun used in the error when the collection outgrows `maxPages`. */
  noun: string;
}

/**
 * "New <record>" poll over a bounded collection. Everhour's lists are bare arrays with no
 * documented order and no changed-since filter (https://developers.everhour.com/pagination.md),
 * so the whole (windowed) collection is read each check and diffed with `pollSnapshot`: the first
 * check only records what exists, a later check emits records whose key is new. Edits and
 * removals never emit. A collection that does not fit in `maxPages` pages (or past the kit's
 * 5000-row cap) makes the check fail with an error naming the limit instead of silently
 * reading only part of it.
 */
export function snapshotTrigger(spec: SnapshotSpec): TriggerDefinition {
  const maxPages = spec.maxPages ?? 10;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state, params }, ctx) {
      const items: unknown[] = [];
      let page = 1;
      for (;;) {
        const res = await spec.read(params as Record<string, unknown>, page, ctx) as ListPage;
        items.push(...res.items);
        if (res.nextPage === null || res.nextPage === undefined) break;
        if (page >= maxPages) {
          throw new Error(
            `Everhour: more than ${maxPages} pages of ${spec.noun}; narrow the trigger settings`,
          );
        }
        page = res.nextPage;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: items.map((item) => ({ key: spec.keyOf(item), values: item })),
        emit: { added: true, updated: false, removed: false },
      });
      return { events: events.map((change) => change.values), nextState };
    },
  };
}

/** `YYYY-MM-DD` for `days` days before now (UTC). */
export function daysAgo(days: number, now = Date.now()): string {
  return new Date(now - days * 86_400_000).toISOString().slice(0, 10);
}

export function lookbackDays(params: Record<string, unknown>, fallback = 3): number {
  const n = Number(params.lookbackDays);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : fallback;
}

/** The shared "Look back (days)" param of the date-windowed triggers. */
export const LOOKBACK_PARAM: ParamDefinition = {
  key: "lookbackDays",
  label: "Look back (days)",
  type: "number",
  default: 3,
  hint:
    "Each check reads records dated within this many days (1–31). A record dated further back than that when it is added is not seen.",
};

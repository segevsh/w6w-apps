import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { pollWindow, toMs } from "./window.ts";

export const OVERLAP_MS = 120_000;
/** Pages one check reads (100 records each): a window past this logs a warning (brief 9.8). */
export const MAX_PAGES = 10;
export const PAGE_SIZE = 100;
const SEEN_WINDOW = MAX_PAGES * PAGE_SIZE + PAGE_SIZE;
/** Snapshot ceiling: the kit throws past this, so an unexpectedly huge list fails loudly. */
const MAX_ROWS = MAX_PAGES * PAGE_SIZE;

export const clock = { now: (): number => Date.now() };

type Item = Record<string, unknown>;

const idOf = (item: Item): string => {
  if (item.id === undefined || item.id === null || item.id === "") {
    throw new Error("Ashby record has no stable id");
  }
  return String(item.id);
};

interface ListResult {
  moreDataAvailable?: boolean;
  [field: string]: unknown;
}

/**
 * `<resource>.list` with `createdAfter = cursor - overlap`, read whole in one check (`returnAll`,
 * up to {@link MAX_PAGES} pages). Same shape as `triggers/new-candidate.ts` (brief 9.1 b, 9.8, 9.9).
 */
export function sinceTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  /** The result field holding the records (`applications`, `jobs`, ...). */
  list: string;
  /** Timestamp the since-filter compares, for the seed floor. */
  tsOf: (item: Item) => number | undefined;
  /** Extra action input derived from the trigger's params. */
  extra?: (params: Record<string, unknown>) => Record<string, unknown>;
  params?: Param[];
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  const action = spec.action as unknown as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    poll({ state, params }, ctx) {
      return pollWindow<Item, number>({
        state,
        now: clock.now(),
        overlapMs: OVERLAP_MS,
        maxPages: 1,
        pageSize: PAGE_SIZE,
        seenWindow: SEEN_WINDOW,
        idOf,
        tsOf: spec.tsOf,
        async load(sinceMs) {
          const result = await action.execute({
            ...(spec.extra?.((params ?? {}) as Record<string, unknown>) ?? {}),
            createdAfter: new Date(sinceMs).toISOString(),
            returnAll: true,
            maxPages: MAX_PAGES,
          }, ctx) as ListResult;
          if (result.moreDataAvailable) {
            ctx.log(
              "warn",
              `${spec.key}: more than ${
                MAX_PAGES * PAGE_SIZE
              } records in one window; the rest are skipped`,
            );
          }
          return { items: (result[spec.list] as Item[] | undefined) ?? [] };
        },
      });
    },
  };
}

/**
 * A small whole collection (users, job postings): each check reads it whole and `pollSnapshot`
 * emits ids it has not seen (added only; brief 9.1 c).
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition<never>;
  list: string;
  params?: Param[];
  output: OutputField[];
  sample: Record<string, unknown>;
}): TriggerDefinition {
  const action = spec.action as unknown as ActionDefinition;
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params: spec.params ?? [],
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const result = await action.execute(
        { returnAll: true, maxPages: MAX_PAGES },
        ctx,
      ) as ListResult;
      const items = ((result[spec.list] as Item[] | undefined) ?? []).filter((i) =>
        i.id !== undefined && i.id !== null && i.id !== ""
      );
      // The list actions here return no "more" flag; a full ceiling means the read was cut short.
      if (items.length >= MAX_ROWS) {
        throw new Error(`${spec.key}: ${MAX_ROWS} or more records; a snapshot cannot be taken`);
      }
      const byId = new Map(items.map((i) => [idOf(i), i]));
      const { events, nextState } = await pollSnapshot({
        state,
        rows: items.map((i) => ({ key: idOf(i), values: { id: i.id } })),
        emit: { added: true, updated: false },
        maxRows: MAX_ROWS,
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}

/** A record's ISO `field` as epoch ms, undefined when absent (the item is then kept). */
export const stamp = (field: string) => (item: Item): number | undefined => toMs(item[field]);

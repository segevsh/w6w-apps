import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollNewItems, pollSnapshot } from "../../_shared/poll/mod.ts";

/** One page of an SES v2 list answer, already reduced to items + the continuation token. */
export interface SesPage {
  items: unknown[];
  nextToken?: string;
}

const MIN_INTERVAL_MS = 300_000;
const PAGE_SIZE = 100;
const SNAPSHOT_PAGE_SIZE = 1000;
const SNAPSHOT_PAGES = 5;
export const OVERLAP_MS = 120_000;
export const MAX_PAGES = 3;
export const MAX_EVENTS = 100;

/**
 * A "new <record>" trigger over a small per-region collection (templates, identities): walk the
 * action's pages (1000 per page, at most 5 = the kit's 5000-row cap), then diff the names against
 * the previous check (`pollSnapshot`, added only). A collection that outgrows the cap is a failed
 * check that names it.
 */
export function snapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  output: OutputField[];
  sample: unknown;
  list(ctx: HookContext, pageSize: number, nextToken?: string): Promise<SesPage>;
  keyOf(item: unknown): string;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: MIN_INTERVAL_MS,
    output: spec.output,
    sample: spec.sample,
    async poll({ state }, ctx) {
      const items: unknown[] = [];
      let token: string | undefined;
      for (let page = 0; page < SNAPSHOT_PAGES; page++) {
        const res = await spec.list(ctx, SNAPSHOT_PAGE_SIZE, token);
        items.push(...res.items);
        token = res.nextToken;
        if (!token) break;
      }
      if (token) {
        throw new Error(
          `${spec.key}: more than ${
            SNAPSHOT_PAGES * SNAPSHOT_PAGE_SIZE
          } items; the poll kit's 5000-row cap`,
        );
      }
      const rows = items.map((item) => ({
        key: spec.keyOf(item),
        values: { key: spec.keyOf(item) },
      }));
      const byKey = new Map(items.map((item) => [spec.keyOf(item), item]));
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byKey.get(e.key)), nextState };
    },
  };
}

/**
 * A "new <record>" trigger over a list with an added-after filter (`StartDate`): each check asks
 * for what was added since `cursor - 2 minutes`, de-duplicates by id (`pollNewItems`), and moves
 * the cursor to "now" only when everything the filter matched was read and emitted. A first check
 * records the ids of the last two minutes and the cursor and emits nothing.
 */
export function sinceTrigger(spec: {
  key: string;
  title: string;
  description: string;
  output: OutputField[];
  sample: unknown;
  list(ctx: HookContext, since: string, nextToken?: string): Promise<SesPage>;
  idOf(item: unknown): string;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: MIN_INTERVAL_MS,
    output: spec.output,
    sample: spec.sample,
    async poll({ state }, ctx) {
      const now = Date.now();
      const prior = (state as { cursor?: unknown } | null)?.cursor;
      const cursor = typeof prior === "number" ? prior : now;
      const since = new Date(cursor - OVERLAP_MS).toISOString();
      let more = false;
      const { events, nextState } = await pollNewItems<unknown>({
        state,
        maxPages: 1,
        maxEvents: MAX_EVENTS,
        idOf: spec.idOf,
        async fetchPage() {
          const items: unknown[] = [];
          let token: string | undefined;
          for (let page = 0; page < MAX_PAGES; page++) {
            const res = await spec.list(ctx, since, token);
            items.push(...res.items);
            token = res.nextToken;
            if (!token) break;
          }
          more = token !== undefined;
          return { items };
        },
      });
      const caughtUp = !more && events.length < MAX_EVENTS;
      return { events, nextState: { ...nextState, cursor: caughtUp ? now : cursor } };
    },
  };
}

import type { HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { pollWindow } from "./window.ts";

/** One page of an SES v2 list answer, already reduced to items + the continuation token. */
export interface SesPage {
  items: unknown[];
  nextToken?: string;
}

const MIN_INTERVAL_MS = 300_000;
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
 * for what was added since `cursor - 2 minutes` and de-duplicates by id. A window longer than
 * `MAX_PAGES` pages is resumed from the persisted `NextToken` on the next check and the cursor
 * moves only once it drains (brief 9.8). The first check stores `floor = now` and emits nothing;
 * later checks drop records stamped before the floor (brief 9.9, `tsOf`).
 */
export function sinceTrigger(spec: {
  key: string;
  title: string;
  description: string;
  output: OutputField[];
  sample: unknown;
  list(ctx: HookContext, since: string, nextToken?: string): Promise<SesPage>;
  idOf(item: unknown): string;
  /** Epoch ms the record was added (the field the `StartDate` filter compares); undefined keeps it. */
  tsOf?(item: unknown): number | undefined;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: MIN_INTERVAL_MS,
    output: spec.output,
    sample: spec.sample,
    poll({ state }, ctx) {
      return pollWindow<unknown, string>({
        state,
        now: Date.now(),
        overlapMs: OVERLAP_MS,
        maxPages: MAX_PAGES,
        pageSize: MAX_EVENTS,
        seenWindow: 1000,
        idOf: spec.idOf,
        tsOf: spec.tsOf ?? (() => undefined),
        async load(sinceMs, token) {
          const res = await spec.list(ctx, new Date(sinceMs).toISOString(), token);
          return { items: res.items, next: res.nextToken || undefined };
        },
      });
    },
  };
}

import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** 100 rows a page, at most 50 pages. */
export const PAGE_SIZE = 100;
export const MAX_PAGES = 50;
export const MAX_ROWS = PAGE_SIZE * MAX_PAGES;

/**
 * "New <record>" for a Superchat list that documents no sort order
 * (https://developers.superchat.com/reference/welcome; only contacts, channels and files state
 * "sorted descendingly by created_at"). The whole collection is read through the SAME list action,
 * following `nextCursor` page by page, and snapshot-diffed, additions only, so the result does not
 * depend on the order. A collection of more than `MAX_ROWS` rows fails the check with a clear error.
 */
export function snapshotTrigger(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  /** Fixed action arguments built from the user's params. */
  input?: (params: Record<string, unknown>) => Record<string, unknown>;
  params?: Param[];
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    type: "poll",
    minIntervalMs: 300_000,
    params: o.params,
    output: o.output,
    sample: o.sample,
    async poll({ params, state }, ctx) {
      const base = o.input?.(params as Record<string, unknown>) ?? {};
      const rows: Array<{ key: string; values: unknown }> = [];
      let after: string | undefined;
      for (let page = 0;; page++) {
        if (page >= MAX_PAGES) {
          throw new Error(
            `Superchat ${o.key}: more than ${MAX_ROWS} rows; too many to watch for new ones`,
          );
        }
        const out = await o.action.execute({ ...base, limit: PAGE_SIZE, after }, ctx) as {
          results?: unknown[];
          nextCursor?: string | null;
        };
        for (const item of out.results ?? []) {
          const id = (item as { id?: unknown }).id;
          if (typeof id === "string" && id !== "") rows.push({ key: id, values: item });
        }
        if (!out.nextCursor) break;
        after = out.nextCursor;
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows,
        emit: { added: true, updated: false, removed: false },
        maxRows: MAX_ROWS,
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}

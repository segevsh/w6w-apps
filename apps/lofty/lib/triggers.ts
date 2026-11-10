import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** Rows asked for per page when a list pages with `limit`/`offset`. */
export const PAGE_SIZE = 100;
/** Pages read per check: 50 x 100 = the kit's 5000-row cap. */
export const MAX_PAGES = 50;

/**
 * A lead's tasks, appointments and notes, and the team's members, have no sort or since filter
 * (Lofty OpenAPI, verified 2026-11-10), so each check reads the whole list through the action's own
 * `execute` and diffs the ids against the last check; added rows only. `paged` lists are walked
 * with `limit`/`offset` until an empty page (more than 5000 rows throws).
 */
export function listSnapshot(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  /** Key holding the rows in the response; `null` when the response is the bare array. */
  listKey: string | null;
  idKey: string;
  paged?: boolean;
  params?: Param[];
  input?: (params: Record<string, unknown>) => Record<string, unknown>;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  const idOf = (item: unknown) => String((item as Record<string, unknown>)[o.idKey] ?? "");
  const rowsOf = (res: unknown): unknown[] => {
    const rows = o.listKey === null
      ? res
      : (res as Record<string, unknown> | undefined)?.[o.listKey];
    return Array.isArray(rows) ? rows : [];
  };
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    minIntervalMs: 300_000,
    ...(o.params ? { params: o.params } : {}),
    output: o.output,
    sample: o.sample,
    async poll({ params, state }, ctx) {
      const base = o.input?.(params as Record<string, unknown>) ?? {};
      const rows = new Map<string, unknown>();
      if (!o.paged) {
        for (const item of rowsOf(await o.action.execute!(base, ctx))) rows.set(idOf(item), item);
      } else {
        for (let page = 0;; page++) {
          if (page === MAX_PAGES) {
            throw new Error(`Lofty list has more than ${MAX_PAGES * PAGE_SIZE} rows`);
          }
          const items = rowsOf(
            await o.action.execute!({ ...base, limit: PAGE_SIZE, offset: rows.size }, ctx),
          );
          if (items.length === 0) break;
          for (const item of items) rows.set(idOf(item), item);
        }
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...rows].map(([key, values]) => ({ key, values })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}

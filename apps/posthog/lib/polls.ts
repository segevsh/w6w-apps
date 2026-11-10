import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** 50 pages of 100 = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 50;
const PAGE = 100;

/**
 * Read every page of an offset-paged PostHog list action (`limit`/`offset` in, `results`/`next`
 * out) through the SAME `execute` the action runs with, rows keyed by `id`.
 */
export async function listAll(
  action: ActionDefinition,
  input: Record<string, unknown>,
  ctx: HookContext,
): Promise<Map<string, Record<string, unknown>>> {
  const byId = new Map<string, Record<string, unknown>>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await action.execute({ ...input, limit: PAGE, offset: page * PAGE }, ctx) as {
      results?: Array<Record<string, unknown>>;
      next?: string | null;
    };
    for (const row of Array.isArray(result?.results) ? result.results : []) {
      const id = row?.id;
      if (id === undefined || id === null || String(id) === "") {
        throw new Error("PostHog list returned a record without id");
      }
      byId.set(String(id), row);
    }
    if (typeof result?.next !== "string" || result.next === "") break;
  }
  return byId;
}

/** Diff the rows against the previous check: only newly seen ids become events. */
export async function newRows(state: unknown, rows: Map<string, Record<string, unknown>>) {
  const { events, nextState } = await pollSnapshot({
    state,
    rows: [...rows.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => rows.get(e.key)), nextState };
}

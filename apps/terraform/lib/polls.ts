import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** 50 pages of 100 = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 50;

/**
 * Read every page of a paged list action (`page`/`pageSize` in, `nextPage` out), through the SAME
 * `execute` the action runs with, and return the rows keyed by id.
 */
export async function listAll(
  action: ActionDefinition,
  input: Record<string, unknown>,
  itemsKey: string,
  ctx: HookContext,
  idKey = "id",
): Promise<Map<string, Record<string, unknown>>> {
  const byId = new Map<string, Record<string, unknown>>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await action.execute({ ...input, pageSize: 100, page }, ctx) as Record<
      string,
      unknown
    >;
    const items = Array.isArray(result?.[itemsKey]) ? result[itemsKey] as unknown[] : [];
    for (const item of items) {
      const row = item as Record<string, unknown>;
      const id = row?.[idKey];
      if (typeof id !== "string" || id === "") {
        throw new Error(`Terraform ${itemsKey} list returned a record without ${idKey}`);
      }
      byId.set(id, row);
    }
    if (typeof result?.nextPage !== "number") break;
  }
  return byId;
}

/** Diff the rows against the previous check: only newly seen ids become events. */
export async function newRows(
  state: unknown,
  rows: Map<string, Record<string, unknown>>,
  shape: (row: Record<string, unknown>) => unknown = (r) => r,
) {
  const { events, nextState } = await pollSnapshot({
    state,
    rows: [...rows.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => shape(rows.get(e.key)!)), nextState };
}

import type { ActionDefinition, HookContext } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";

/** 50 pages of 100 = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 50;

/**
 * Reads a whole cursor-paginated collection through the app's OWN list action (`limit` 100 is the
 * documented maximum, https://api.savvycal.com/v1/spec, 2026-11-10), following `metadata.after`
 * until it is absent. A repeated cursor or an empty page also stops the walk.
 */
export async function readAllPages(
  action: ActionDefinition,
  ctx: HookContext,
  input: Record<string, unknown> = {},
): Promise<unknown[]> {
  const all: unknown[] = [];
  let after: string | undefined;
  for (let n = 0; n < MAX_PAGES; n++) {
    const res = await action.execute(
      { ...input, limit: 100, ...(after ? { after } : {}) },
      ctx,
    ) as {
      entries?: unknown[];
      metadata?: { after?: string | null };
    };
    const entries = Array.isArray(res?.entries) ? res.entries : [];
    all.push(...entries);
    const next = res?.metadata?.after;
    if (entries.length === 0 || typeof next !== "string" || next === "" || next === after) {
      return all;
    }
    after = next;
  }
  throw new Error(`SavvyCal list is longer than ${MAX_PAGES} pages; refusing to snapshot it`);
}

/** "New <record>" over a bounded collection: diff the ids against the previous check (added only). */
export async function newRecords(o: {
  state: unknown;
  items: unknown[];
}): Promise<{ events: unknown[]; nextState: unknown }> {
  const byId = new Map<string, unknown>();
  for (const item of o.items) {
    const id = (item as { id?: unknown })?.id;
    if (typeof id !== "string" || id === "") {
      throw new Error("SavvyCal list returned a record without an id");
    }
    byId.set(id, item);
  }
  const { events, nextState } = await pollSnapshot({
    state: o.state,
    rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
    emit: { added: true, updated: false },
  });
  return { events: events.map((e) => byId.get(e.key)), nextState };
}

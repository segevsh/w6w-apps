import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { MAX_PAGE_LIMIT } from "./client.ts";

/** 5 pages of 1000 (Brex's documented `limit` ceiling) = the snapshot kit's 5000-row cap. */
const MAX_PAGES = 5;

interface Page {
  items?: unknown[];
  next_cursor?: string | null;
}

/**
 * Reads a whole Brex collection through the app's OWN list action (`cursor` / `limit` in,
 * `items` / `next_cursor` out; `limit` 1000 is the documented maximum, a larger one is a `400`).
 * Throws rather than snapshot a collection longer than the kit's 5000-row cap.
 */
export async function readAll(
  action: ActionDefinition<never>,
  ctx: HookContext,
  extra: Record<string, unknown> = {},
): Promise<unknown[]> {
  const all: unknown[] = [];
  let cursor: string | undefined;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await (action as ActionDefinition).execute(
      { ...extra, limit: MAX_PAGE_LIMIT, ...(cursor ? { cursor } : {}) },
      ctx,
    ) as Page;
    all.push(...(Array.isArray(res?.items) ? res.items : []));
    if (!res?.next_cursor) return all;
    cursor = res.next_cursor;
  }
  throw new Error(
    `Brex list is longer than ${MAX_PAGES * MAX_PAGE_LIMIT} rows; refusing to snapshot it`,
  );
}

/**
 * "New <record>" over a Brex list: every check reads the whole (bounded) collection through the
 * list action and diffs the ids against the previous check (`pollSnapshot`, added only; the first
 * check records the ids and emits nothing).
 */
export function newRecordTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: unknown;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: spec.output,
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const items = await readAll(spec.action as ActionDefinition<never>, ctx);
      const byId = new Map<string, unknown>();
      for (const item of items) {
        const id = (item as { id?: unknown }).id;
        if (typeof id !== "string" || id === "") {
          throw new Error("Brex list returned a record without an id");
        }
        byId.set(id, item);
      }
      const { events, nextState } = await pollSnapshot({
        state,
        rows: [...byId.keys()].map((key) => ({ key, values: { key } })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => byId.get(e.key)), nextState };
    },
  };
}

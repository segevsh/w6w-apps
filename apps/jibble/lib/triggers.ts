import type { ActionDefinition, OutputField, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";

/**
 * Shared poll shapes for the Jibble triggers. Every trigger calls the SAME list action as the
 * action step does (same client, host and OData query), so it inherits that action's auth and
 * request building.
 *
 * Jibble returns no `@odata.nextLink`: the caller drives `$top`/`$skip` itself (`lib/client.ts`).
 */

/** Rows requested per page. */
export const PAGE_SIZE = 100;
/** Pages a snapshot read walks before it gives up (50 x 100 = the kit's 5000-row cap). */
export const MAX_PAGES = 50;

type Record_ = { id?: unknown; updatedAt?: unknown };

export const idOfRecord = (item: unknown): string => String((item as Record_).id ?? "");

/** `<id>:<updatedAt>` — an edit changes the stamp, so an edited record is a new event. */
export const idOfRevision = (item: unknown): string => {
  const r = item as Record_;
  return `${String(r.id ?? "")}:${String(r.updatedAt ?? "")}`;
};

const itemsOf = (result: unknown): unknown[] => (result as { items?: unknown[] }).items ?? [];

/** Newest-first feed: `$orderby=<createdAt|updatedAt> desc&$top=100&$skip=0` (OData `$orderby`). */
export function odataFeed(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  orderBy: "createdAt desc" | "updatedAt desc";
  idOf?: (item: unknown) => string;
  output: OutputField[];
  sample: unknown;
}) {
  return pollFromListAction({
    key: o.key,
    title: o.title,
    description: o.description,
    action: o.action,
    input: () => ({ orderBy: o.orderBy, top: PAGE_SIZE, skip: 0 }),
    items: itemsOf,
    idOf: o.idOf ?? idOfRecord,
    output: o.output,
    sample: o.sample,
    maxPages: 1,
  });
}

/** Read every row of a list action page by page (`$top`/`$skip`), stopping at the first empty page. */
export async function readAll(
  action: ActionDefinition,
  filter: string | undefined,
  ctx: Parameters<NonNullable<ActionDefinition["execute"]>>[1],
): Promise<unknown[]> {
  const rows = new Map<string, unknown>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const input: Record<string, unknown> = { top: PAGE_SIZE, skip: rows.size };
    if (filter) input.filter = filter;
    const items = itemsOf(await action.execute!(input, ctx));
    if (items.length === 0) return [...rows.values()];
    for (const item of items) rows.set(idOfRecord(item), item);
  }
  throw new Error(`Jibble list has more than ${MAX_PAGES * PAGE_SIZE} rows; narrow the filter`);
}

/** Bounded collection: diff the whole read against the last check; emit added rows only. */
export function odataSnapshot(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  filter?: () => string;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    minIntervalMs: 300_000,
    output: o.output,
    sample: o.sample,
    async poll({ state }, ctx) {
      const items = await readAll(o.action, o.filter?.(), ctx);
      const { events, nextState } = await pollSnapshot({
        state,
        rows: items.map((item) => ({ key: idOfRecord(item), values: item })),
        emit: { added: true, updated: false },
      });
      return { events: events.map((e) => e.values), nextState };
    },
  };
}

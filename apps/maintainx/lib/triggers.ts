import type { ActionDefinition, OutputField, Param, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";
import workorderList from "../actions/workorder-list.ts";

/** Fields every work-order event carries (vendor OpenAPI `GET /workorders`, verified 2026-11-10). */
export const WORK_ORDER_OUTPUT: OutputField[] = [
  { key: "id", type: "number", label: "Work order ID" },
  { key: "sequentialId", type: "number", label: "Sequential ID" },
  { key: "title", type: "string", label: "Title" },
  { key: "status", type: "string", label: "Status" },
  { key: "priority", type: "string", label: "Priority" },
  { key: "createdAt", type: "string", label: "Created at" },
  { key: "updatedAt", type: "string", label: "Updated at" },
];

export const WORK_ORDER_SAMPLE = {
  id: 1001,
  sequentialId: 42,
  title: "Replace conveyor belt",
  status: "OPEN",
  priority: "MEDIUM",
  createdAt: "2026-11-09T09:00:00.000Z",
  updatedAt: "2026-11-09T09:00:00.000Z",
};

/** `GET /workorders` newest-first by an explicit `sort` (`-createdAt` / `-updatedAt`). */
export function workOrderFeed(o: {
  key: string;
  title: string;
  description: string;
  sort: "-createdAt" | "-updatedAt";
  idOf(item: unknown): string;
}) {
  return pollFromListAction({
    key: o.key,
    title: o.title,
    description: o.description,
    action: workorderList as ActionDefinition,
    input: () => ({ sort: o.sort, limit: 100 }),
    items: (r) => (r as { workOrders?: unknown[] }).workOrders ?? [],
    idOf: o.idOf,
    output: WORK_ORDER_OUTPUT,
    sample: WORK_ORDER_SAMPLE,
    maxPages: 1,
  });
}

/** Page size for the cursor reads below (the vendor allows 1-200, default 100). */
const PAGE_SIZE = 200;
/** Pages read per check: 25 x 200 = the kit's 5000-row cap. */
const MAX_PAGES = 25;

const idString = (item: unknown): string => String((item as { id?: unknown }).id ?? "");

/** `<id>:<updatedAt>` — an edit changes the stamp, so an edited record is a new event. */
export const idOfRevision = (item: unknown): string => {
  const r = item as { id?: unknown; updatedAt?: unknown };
  return `${String(r.id ?? "")}:${String(r.updatedAt ?? "")}`;
};

/** Newest-first by an explicit `sort` (`-createdAt` / `-updatedAt`) on any sortable list. */
export function sortedFeed(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  listKey: string;
  sort: "-createdAt" | "-updatedAt";
  idOf?: (item: unknown) => string;
  output: OutputField[];
  sample: unknown;
}) {
  return pollFromListAction({
    key: o.key,
    title: o.title,
    description: o.description,
    action: o.action,
    input: () => ({ sort: o.sort, limit: 100 }),
    items: (r) => (r as Record<string, unknown[] | undefined>)[o.listKey] ?? [],
    idOf: o.idOf ?? idString,
    output: o.output,
    sample: o.sample,
    maxPages: 1,
  });
}

/**
 * A list with no sort or since filter (locations, meters, teams, users, vendors, one work order's
 * comments): read it whole through the cursor (`limit=200`, then `cursor=<nextCursor>`) and diff
 * the ids against the last check; added rows only. More than 5000 rows throws.
 */
export function cursorSnapshot(o: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  listKey: string;
  params?: Param[];
  input?: (params: Record<string, unknown>) => Record<string, unknown>;
  output: OutputField[];
  sample: unknown;
}): TriggerDefinition {
  return {
    key: o.key,
    title: o.title,
    description: o.description,
    minIntervalMs: 300_000,
    ...(o.params ? { params: o.params } : {}),
    output: o.output,
    sample: o.sample,
    async poll({ params, state }, ctx) {
      const rows = new Map<string, unknown>();
      let cursor: string | undefined;
      for (let page = 0;; page++) {
        if (page === MAX_PAGES) {
          throw new Error(`MaintainX list has more than ${MAX_PAGES * PAGE_SIZE} rows`);
        }
        const res = await o.action.execute!(
          {
            ...o.input?.(params as Record<string, unknown>),
            limit: PAGE_SIZE,
            ...(cursor ? { cursor } : {}),
          },
          ctx,
        ) as Record<string, unknown>;
        for (const item of (res[o.listKey] as unknown[] | undefined) ?? []) {
          rows.set(idString(item), item);
        }
        cursor = (res.nextCursor as string | null | undefined) || undefined;
        if (!cursor) break;
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

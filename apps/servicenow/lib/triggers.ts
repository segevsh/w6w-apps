import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSinceWindow, type WindowState } from "./since-window.ts";
import tableRecordGetMany from "../actions/table-record-get-many.ts";

export const clock = { now: (): number => Date.now() };
const OVERLAP_MS = 120_000;
const PAGE = 100;

interface TableParams {
  table: string;
}
interface Row {
  sys_id?: unknown;
  sys_created_on?: unknown;
  sys_updated_on?: unknown;
}

/** ServiceNow encoded-query datetime: `YYYY-MM-DD HH:MM:SS`, UTC. */
function serviceNowTime(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

function parseTime(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(ms) ? undefined : ms;
}

function check(
  params: TableParams,
  state: unknown,
  ctx: HookContext,
  updated: boolean,
): Promise<{ events: unknown[]; nextState: WindowState }> {
  const stamp = updated ? "sys_updated_on" : "sys_created_on";
  return pollSinceWindow<Row>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    floorGranularityMs: 1000,
    firstPos: 0,
    step: PAGE,
    backup: 10,
    maxPages: 2,
    maxEvents: 2 * PAGE,
    seenWindow: 500,
    idOf: (row) =>
      updated ? `${row.sys_id ?? ""}:${row.sys_updated_on ?? ""}` : String(row.sys_id ?? ""),
    stampOf: (row) => parseTime(row[stamp]),
    async fetchPage(sinceMs, offset) {
      const result = await tableRecordGetMany.execute({
        table: params.table,
        query: `${stamp}>=${serviceNowTime(sinceMs)}^ORDERBY${stamp}^ORDERBYsys_id`,
        limit: PAGE,
        offset,
      }, ctx) as { result?: Row[] };
      const items = result.result ?? [];
      return { items, more: items.length >= PAGE };
    },
  });
}

export const newTableRecordTrigger: TriggerDefinition<TableParams> = {
  key: "new-table-record",
  title: "New Table Record",
  description: "Runs when ServiceNow creates a record in the selected table.",
  params: [{ key: "table", label: "Table", type: "string", required: true }],
  output: [{ key: "sys_id", type: "string", label: "Record sys_id" }],
  sample: { sys_id: "0123456789abcdef0123456789abcdef" },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return check(params, state, ctx, false);
  },
};

export const newOrUpdatedTableRecordTrigger: TriggerDefinition<TableParams> = {
  key: "new-or-updated-table-record",
  title: "New or Updated Table Record",
  description: "Runs when ServiceNow creates or updates a record in the selected table.",
  params: [{ key: "table", label: "Table", type: "string", required: true }],
  output: [{ key: "sys_id", type: "string", label: "Record sys_id" }],
  sample: { sys_id: "0123456789abcdef0123456789abcdef", sys_updated_on: "2026-11-09 12:00:00" },
  minIntervalMs: 300_000,
  poll({ params, state }, ctx) {
    return check(params, state, ctx, true);
  },
};

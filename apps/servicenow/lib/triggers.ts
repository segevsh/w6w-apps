import type { HookContext, TriggerDefinition } from "@w6w/types";
import { type IdsState, pollNewItems } from "../../_shared/poll/mod.ts";
import tableRecordGetMany from "../actions/table-record-get-many.ts";

export const clock = { now: (): number => Date.now() };
const OVERLAP_MS = 120_000;

interface TableParams {
  table: string;
}
interface TableState extends IdsState {
  cursor: string;
}

function serviceNowTime(iso: string): string {
  return new Date(new Date(iso).getTime() - OVERLAP_MS).toISOString().slice(0, 19).replace(
    "T",
    " ",
  );
}

async function check(params: TableParams, state: unknown, ctx: HookContext, updated: boolean) {
  const now = new Date(clock.now()).toISOString();
  const prior = state as { cursor?: unknown } | null;
  const cursor = typeof prior?.cursor === "string" ? prior.cursor : now;
  const stamp = updated ? "sys_updated_on" : "sys_created_on";
  const { events, nextState } = await pollNewItems<unknown>({
    state,
    maxPages: 1,
    maxEvents: 100,
    seenWindow: 200,
    idOf: (item) => {
      const row = item as { sys_id?: unknown; sys_updated_on?: unknown };
      return updated ? `${row.sys_id ?? ""}:${row.sys_updated_on ?? ""}` : String(row.sys_id ?? "");
    },
    async fetchPage() {
      const result = await tableRecordGetMany.execute({
        table: params.table,
        query: `${stamp}>=${serviceNowTime(cursor)}^ORDERBYDESC${stamp}`,
        limit: 100,
        offset: 0,
      }, ctx) as { result?: unknown[] };
      return { items: result.result ?? [] };
    },
  });
  return { events, nextState: { ...nextState, cursor: now } as TableState };
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

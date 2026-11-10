import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import listSheets from "../actions/list-sheets.ts";
import { SPREADSHEET_ID } from "../lib/params.ts";

interface SheetProperties {
  sheetId: number;
  title: string;
  index?: number;
  sheetType?: string;
  gridProperties?: { rowCount?: number; columnCount?: number };
}

/**
 * A spreadsheet's tabs are a small bounded collection (one `spreadsheets.get` with the
 * `sheets.properties` field mask, the `list-sheets` request), so each check reads all of them and
 * diffs `sheetId`s against the seeded snapshot. Only additions are emitted (a rename keeps its id).
 */
const newSheet: TriggerDefinition<{ spreadsheetId: string }> = {
  key: "new-sheet",
  title: "New Sheet",
  description:
    "The run gets each sheet tab newly added to a spreadsheet: its name, sheet ID, position and grid size.",
  params: [SPREADSHEET_ID],
  output: [
    { key: "sheetId", type: "number", label: "Sheet ID" },
    { key: "title", type: "string", label: "Name" },
    { key: "index", type: "number", label: "Position" },
    { key: "sheetType", type: "string", label: "Type" },
    { key: "gridProperties", type: "object", label: "Rows and columns" },
  ],
  sample: {
    sheetId: 1234,
    title: "Q4 Leads",
    index: 1,
    sheetType: "GRID",
    gridProperties: { rowCount: 1000, columnCount: 26 },
  },
  minIntervalMs: 60_000,
  async poll({ params, state }, ctx) {
    const res = await listSheets.execute({ spreadsheetId: params.spreadsheetId }, ctx) as {
      sheets: SheetProperties[];
    };
    const rows = res.sheets.map((s) => ({ key: String(s.sheetId), values: s }));
    const { events, nextState } = await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
    });
    return { events: events.map((e) => e.values as SheetProperties), nextState };
  },
};

export default newSheet;

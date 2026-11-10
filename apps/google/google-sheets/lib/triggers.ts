import type { HookContext, OutputField, ParamDefinition, TriggerDefinition } from "@w6w/types";
import sheetRead from "../actions/sheet-read.ts";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import { SPREADSHEET_ID } from "./params.ts";

/**
 * Google Sheets row triggers (rfcs/trigger.md, poll form).
 *
 * Each check reads the sheet through the `sheet-read` action — the same
 * `GET /spreadsheets/{id}/values/{sheet}` request, client and auth — and diffs the rows against the
 * hashes stored by the previous check (`pollSnapshot`). Row 1 is the header row.
 *
 *   - By default a row is identified by its row number, so inserting or deleting a row shifts every
 *     row below it and they all read as updated. Set `keyColumn` (a header name) to identify rows by
 *     that column's value instead: moving a row is then not a change.
 *   - Hashes cover the cells in column order, not the header names: renaming a header is not an
 *     update. Rows with no cell at all are skipped, as are rows with a blank key.
 *   - A `keyColumn` holding the same value twice is an error that names the column and value.
 *   - More than 5000 data rows is an error (the kit's cap); removals are not offered.
 */

export const MAX_ROWS = 5000;

export type RowChange = "added" | "updated";

interface Params {
  spreadsheetId: string;
  sheetName: string;
  keyColumn?: string;
}

const PARAMS: ParamDefinition[] = [
  SPREADSHEET_ID,
  {
    key: "sheetName",
    label: "Sheet name",
    type: "string",
    required: true,
    placeholder: "Sheet1",
    hint: "The tab to watch. Its first row must be the header row.",
  },
  {
    key: "keyColumn",
    label: "Key column",
    type: "string",
    hint:
      "Header of a column whose values are unique per row (an ID). Leave empty to identify rows by row number; then an inserted row shows as updates to every row below it.",
  },
];

const OUTPUT: OutputField[] = [
  { key: "change", type: "string", label: "Change" },
  {
    key: "rowNumber",
    type: "number",
    label: "Row number",
  },
  { key: "key", type: "string", label: "Key" },
  { key: "values", type: "object", label: "Values" },
];

type Cell = unknown;

function blank(c: Cell): boolean {
  return c === undefined || c === null || c === "";
}

/** Header names, made unique and non-empty (blank → column letter, repeat → `name_2`). */
function headerNames(row: Cell[]): string[] {
  const seen = new Set<string>();
  return row.map((cell, i) => {
    const base = blank(cell) ? columnLetter(i) : String(cell);
    let name = base;
    for (let n = 2; seen.has(name); n++) name = `${base}_${n}`;
    seen.add(name);
    return name;
  });
}

function columnLetter(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
}

/** Turn the sheet's `values` grid into keyed rows (exported for tests). */
export function toRows(
  grid: Cell[][],
  keyColumn?: string,
): Array<{ key: string; rowNumber: number; cells: Cell[]; values: Record<string, Cell> }> {
  const headers = headerNames(grid[0] ?? []);
  let keyIndex = -1;
  if (keyColumn !== undefined && keyColumn !== "") {
    keyIndex = headers.indexOf(keyColumn);
    if (keyIndex < 0) {
      throw new Error(
        `Key column ${JSON.stringify(keyColumn)} is not a header in row 1 (headers: ${
          headers.join(", ") || "none"
        })`,
      );
    }
  }
  const rows = [];
  const owner = new Map<string, number>();
  for (let i = 1; i < grid.length; i++) {
    const raw = grid[i] ?? [];
    const cells = [...raw];
    while (cells.length > 0 && blank(cells[cells.length - 1])) cells.pop();
    if (cells.length === 0) continue; // blank row
    const rowNumber = i + 1;
    let key = String(rowNumber);
    if (keyIndex >= 0) {
      const k = cells[keyIndex];
      if (blank(k)) continue; // a row without a key cannot be tracked
      key = String(k);
      const first = owner.get(key);
      if (first !== undefined) {
        throw new Error(
          `Key column ${JSON.stringify(keyColumn)} has the value ${
            JSON.stringify(key)
          } in rows ${first} and ${rowNumber}; each row needs a unique key (or clear the key column to use row numbers)`,
        );
      }
      owner.set(key, rowNumber);
    }
    const values: Record<string, Cell> = {};
    headers.forEach((h, c) => values[h] = blank(raw[c]) ? "" : raw[c]);
    // Cells beyond the header row keep their column letter.
    for (let c = headers.length; c < raw.length; c++) {
      if (!blank(raw[c])) values[columnLetter(c)] = raw[c];
    }
    rows.push({ key, rowNumber, cells, values });
  }
  return rows;
}

export function rowTrigger(spec: {
  key: string;
  title: string;
  description: string;
  emit: Record<RowChange, boolean>;
  sample: unknown;
}): TriggerDefinition<Params> {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    minIntervalMs: 60_000,
    params: PARAMS,
    output: OUTPUT,
    sample: spec.sample,
    async poll({ params, state }, ctx: HookContext) {
      const result = await sheetRead.execute({
        spreadsheetId: params.spreadsheetId,
        range: params.sheetName,
        valueRenderOption: "UNFORMATTED_VALUE",
        majorDimension: "ROWS",
      }, ctx) as { values?: Cell[][] } | undefined;
      const rows = toRows(result?.values ?? [], params.keyColumn);
      const byKey = new Map(rows.map((r) => [r.key, r]));
      const usesKey = params.keyColumn !== undefined && params.keyColumn !== "";
      const { events, nextState } = await pollSnapshot({
        state,
        rows: rows.map((r) => ({ key: r.key, values: r.cells })),
        emit: { added: spec.emit.added, updated: spec.emit.updated },
        maxRows: MAX_ROWS,
      });
      return {
        events: events.map((e) => {
          const row = byKey.get(e.key)!;
          return usesKey
            ? { change: e.change, key: e.key, values: row.values }
            : { change: e.change, rowNumber: row.rowNumber, values: row.values };
        }),
        nextState,
      };
    },
  };
}

const SAMPLE_VALUES = { id: "1042", name: "Ada Lovelace", email: "ada@example.com" };

export const sampleFor = (change: RowChange | "added-or-updated") => ({
  change: change === "updated" ? "updated" : "added",
  rowNumber: 7,
  values: SAMPLE_VALUES,
});

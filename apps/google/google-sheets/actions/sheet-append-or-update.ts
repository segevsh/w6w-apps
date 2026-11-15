import type { ActionDefinition } from "@w6w/types";
import { GoogleSheetsClient } from "../lib/client.ts";
import { SPREADSHEET_ID } from "../lib/params.ts";

interface Input {
  spreadsheetId: string;
  /** Sheet tab name (e.g. `Sheet1`). Range for the whole tab is inferred. */
  sheetName: string;
  /**
   * The match column: its header text as written in the header row (`email`), or its letter
   * (`C`). See {@link matchColumn}.
   */
  columnToMatchOn: string;
  /**
   * Input rows keyed by header name (case and surrounding spaces ignored). Missing headers → left
   * blank; a key with no column is added as a new column, or dropped (`extraFields`). One object,
   * or a JSON string of one or of an array, is accepted too (see {@link normalizeRows}).
   */
  rows: unknown;
  /** `"add"` (default): a key with no column becomes a new header. `"ignore"`: it is dropped. */
  extraFields?: string;
  /** Row index (1-based) containing the header names. Defaults to 1. */
  headerRow?: number;
  valueInputOption?: string;
}

/**
 * Upsert rows by a header-name match column. Mirrors n8n's `appendOrUpdate`:
 *
 *   1. Read the sheet once (`values.get` on the whole tab) so we know the
 *      column headers and existing rows.
 *   2. Locate the match column by header name (or letter). Any input field with no column is
 *      added to the header row first (`extraFields: "add"`), so no value is silently dropped;
 *      an empty sheet gets its whole header row this way.
 *   3. For each input row, either UPDATE (single-row `values.update`) if the
 *      match value already exists, or collect it into an APPEND batch.
 *   4. Send one `values.append` at the end with the leftover rows.
 *
 * We keep the wire calls exactly to Google's spec — no batching magic.
 */
const sheetAppendOrUpdate: ActionDefinition<Input> = {
  key: "sheet-append-or-update",
  type: "perform",
  resource: "sheet",
  title: "Append or Update Row",
  description: "Upsert rows by matching on a column value (append if new, update if it exists).",
  idempotent: true,
  params: [
    SPREADSHEET_ID,
    { key: "sheetName", label: "Sheet Name", type: "string", required: true },
    {
      key: "columnToMatchOn",
      label: "Column to match on",
      type: "string",
      required: true,
      hint:
        "The column's header as written in the header row (e.g. `email`), or its letter (e.g. `C`). Each row's value under that header decides update or append.",
    },
    {
      key: "rows",
      label: "Rows",
      type: "json",
      required: true,
      hint: "Array of `{ header: value }` objects. Missing headers stay blank.",
    },
    { key: "headerRow", label: "Header Row", type: "number", default: 1 },
    {
      key: "extraFields",
      label: "Fields with no column",
      type: "select",
      options: [
        { value: "add", label: "Add as new columns" },
        { value: "ignore", label: "Ignore" },
      ],
      default: "add",
      hint:
        "A field whose name is not a header yet. An empty sheet takes its headers from the rows.",
    },
    {
      key: "valueInputOption",
      label: "Value Input Option",
      type: "select",
      options: [
        { value: "USER_ENTERED", label: "User entered" },
        { value: "RAW", label: "Raw" },
      ],
      default: "USER_ENTERED",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleSheetsClient(ctx);
    const valueInputOption = input.valueInputOption ?? "USER_ENTERED";
    const headerRow = input.headerRow ?? 1;
    const sheet = encodeURIComponent(input.sheetName);
    const spreadsheet = encodeURIComponent(input.spreadsheetId);

    // Fetch the whole tab so we know headers + existing match-column values.
    const existing = await client.request<{ values?: string[][] }>(
      `/spreadsheets/${spreadsheet}/values/${sheet}`,
      { query: { valueRenderOption: "FORMATTED_VALUE" } },
    );
    const rows = existing.values ?? [];
    const inputRows = normalizeRows(input.rows);
    const headers = [...(rows[headerRow - 1] ?? [])].map((h) => String(h ?? ""));
    const norm = (k: string) => k.trim().toLowerCase();

    // Fields with no column yet: add them to the header row (one write) unless told to ignore.
    if ((input.extraFields ?? "add") !== "ignore") {
      const known = new Set(headers.map(norm).filter((h) => h !== ""));
      const added: string[] = [];
      for (const row of inputRows) {
        for (const k of Object.keys(row)) {
          if (norm(k) === "" || known.has(norm(k))) continue;
          known.add(norm(k));
          added.push(k);
        }
      }
      if (added.length) {
        // Trailing blank header cells are reused before the row grows.
        while (headers.length && headers[headers.length - 1].trim() === "") headers.pop();
        const start = headers.length;
        headers.push(...added);
        const range = `${input.sheetName}!${columnLetter(start)}${headerRow}`;
        await client.request(`/spreadsheets/${spreadsheet}/values/${encodeURIComponent(range)}`, {
          method: "PUT",
          query: { valueInputOption: "RAW" },
          body: { range, values: [added] },
        });
      }
    }

    const matchIdx = matchColumn(headers, input.columnToMatchOn);
    if (matchIdx === -1) {
      const found = headers.filter((h) => h.trim() !== "");
      throw new Error(
        `Column to match on "${input.columnToMatchOn}" is not a header in row ${headerRow}` +
          (found.length
            ? ` (headers found: ${found.map((h) => `"${h}"`).join(", ")})`
            : " (that row is empty: set Header Row to the row holding the column names)") +
          ", nor a column letter like A.",
      );
    }

    /** A row's value for a header: the exact key, else the key equal ignoring case and spaces. */
    const valueOf = (row: Record<string, unknown>, header: string): unknown => {
      if (header in row) return row[header];
      const k = Object.keys(row).find((key) => norm(key) === norm(header) && norm(header) !== "");
      return k === undefined ? undefined : row[k];
    };
    const cell = (v: unknown): unknown =>
      v === undefined || v === null ? "" : typeof v === "object" ? JSON.stringify(v) : v;
    const rowValuesFor = (row: Record<string, unknown>): unknown[] =>
      headers.map((h) => cell(valueOf(row, h)));
    const matchHeader = headers[matchIdx];

    const toAppend: unknown[][] = [];
    const updated: unknown[] = [];

    for (const inputRow of inputRows) {
      const raw = valueOf(inputRow, matchHeader);
      const matchValue = raw === undefined || raw === null ? "" : String(raw);
      // Skip the header rows when scanning; row indices are 0-based here.
      // A row with no match value can only be new: never "update" the first blank-keyed row.
      let foundAt = -1;
      for (let r = headerRow; matchValue !== "" && r < rows.length; r++) {
        if ((rows[r]?.[matchIdx] ?? "") === matchValue) {
          foundAt = r;
          break;
        }
      }
      if (foundAt === -1) {
        toAppend.push(rowValuesFor(inputRow));
      } else {
        // 1-based row number for A1 notation.
        const sheetRow = foundAt + 1;
        const range = `${input.sheetName}!A${sheetRow}`;
        const resp = await client.request(
          `/spreadsheets/${spreadsheet}/values/${encodeURIComponent(range)}`,
          {
            method: "PUT",
            query: { valueInputOption },
            body: { range, values: [rowValuesFor(inputRow)] },
          },
        );
        updated.push(resp);
      }
    }

    let appended: unknown = null;
    if (toAppend.length) {
      const range = `${input.sheetName}!A:A`;
      appended = await client.request(
        `/spreadsheets/${spreadsheet}/values/${encodeURIComponent(range)}:append`,
        {
          method: "POST",
          query: { valueInputOption, insertDataOption: "INSERT_ROWS" },
          body: { range, values: toAppend },
        },
      );
    }

    return { updated, appended, updatedCount: updated.length, appendedCount: toAppend.length };
  },
};

/**
 * The `rows` input as plain objects. Accepted: an array of objects; a single object; a JSON string
 * of either; an array whose items are JSON strings of objects (what a quoted `"{{ … }}"` inside a
 * JSON array yields). Anything else is refused by row number, so nothing is written as blanks.
 */
export function normalizeRows(rows: unknown): Record<string, unknown>[] {
  const parse = (v: unknown): unknown => {
    if (typeof v !== "string") return v;
    const t = v.trim();
    if (!t.startsWith("{") && !t.startsWith("[")) return v;
    try {
      return JSON.parse(t);
    } catch {
      return v;
    }
  };
  const top = parse(rows);
  const list = Array.isArray(top) ? top : [top];
  const out: Record<string, unknown>[] = [];
  list.forEach((item, i) => {
    const v = parse(item);
    const items = Array.isArray(v) ? v : [v];
    for (const row of items) {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        const shown = typeof row === "string" ? `"${row.slice(0, 60)}"` : JSON.stringify(row);
        throw new Error(
          `Row ${i + 1} is not an object of { header: value } (got ${shown}). ` +
            "Map Rows to an object or an array of objects whose keys are the sheet's headers.",
        );
      }
      if (Object.keys(row).length === 0) {
        throw new Error(`Row ${i + 1} is an empty object: it has no fields to write.`);
      }
      out.push(row as Record<string, unknown>);
    }
  });
  if (out.length === 0) throw new Error("Rows is empty: there is nothing to append or update.");
  return out;
}

/** 0-based column index → A1 letters (0 → A, 25 → Z, 26 → AA). */
export function columnLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/**
 * The match column's 0-based index in `headers`, or -1. In order: the exact header text; the same
 * ignoring case and surrounding spaces; a column letter (`A`, `c`, `AA`) when it lands on a header.
 * A header literally named like a letter (`A`) wins over the letter, since it is checked first.
 */
export function matchColumn(headers: readonly string[], column: string): number {
  const exact = headers.indexOf(column);
  if (exact !== -1) return exact;
  const want = column.trim().toLowerCase();
  const loose = headers.findIndex((h) => String(h ?? "").trim().toLowerCase() === want);
  if (loose !== -1) return loose;
  if (/^[a-z]{1,3}$/.test(want)) {
    let n = 0;
    for (const ch of want) n = n * 26 + (ch.charCodeAt(0) - 96);
    const idx = n - 1;
    if (idx < headers.length && String(headers[idx] ?? "").trim() !== "") return idx;
  }
  return -1;
}

export default sheetAppendOrUpdate;

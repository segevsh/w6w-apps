import type { ParamDefinition } from "@w6w/types";

/**
 * The spreadsheet id from either a bare id or a pasted Sheets URL —
 * `https://docs.google.com/spreadsheets/d/<id>/edit?gid=0#gid=0`, including the
 * `/spreadsheets/u/<n>/d/<id>` form a signed-in multi-account browser shows.
 * Anything else (a non-string, an unrecognised URL) is returned trimmed/unchanged
 * so Google reports it instead of us guessing.
 */
export function spreadsheetIdFrom(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const v = value.trim();
  const m = /\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/.exec(v);
  return m ? m[1] : v;
}

/** The `spreadsheetId` param every action and trigger shares: an id OR the sheet's URL. */
export const SPREADSHEET_ID: ParamDefinition = {
  key: "spreadsheetId",
  label: "Spreadsheet",
  type: "string",
  required: true,
  placeholder: "Spreadsheet ID or URL",
  hint: "Paste the spreadsheet's URL or just its ID.",
  parse: spreadsheetIdFrom,
};

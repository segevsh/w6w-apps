import type { ActionDefinition } from "@w6w/types";
import { compact, type GenericResult, SmartsheetClient } from "../lib/client.ts";

interface Input {
  sheetId: string;
  title: string;
  type: string;
  index: number;
  options?: string[];
  symbol?: string;
  description?: string;
  width?: number;
  hidden?: boolean;
  locked?: boolean;
  validation?: boolean;
}

/**
 * `POST /sheets/{sheetId}/columns` — add a column.
 *
 * `ColumnCreateRequestObject` requires exactly three attributes: **`index`**,
 * **`title`** and **`type`**. `index` is the 0-based position the new column
 * takes; it is required, not optional, which is why this action marks it so.
 *
 * The `type` values below are the distinct discriminators across the thirteen
 * members of the `ColumnCreateRequestObject` union. Two carry extra structure:
 *   - `PICKLIST` — supply `options: ["To Do", "Done"]`, or `symbol` for a symbol
 *     column (`STAR`, `RYG`, `PRIORITY`, `PROGRESS`, `HEARTS`, … 25 in total).
 *   - `CHECKBOX` — optionally `symbol` of `FLAG` or `STAR`; omitting it gives a
 *     plain box.
 *
 * System columns (`CREATED_BY`, `MODIFIED_DATE`, …) are modelled by Smartsheet as
 * a `CONTACT_LIST`/`DATETIME` column plus a `systemColumnType`, and are not
 * exposed here — they are a different creation shape and adding one blindly is
 * not something a workflow should do by accident.
 *
 * Not idempotent: each call adds another column, and Smartsheet offers no
 * idempotency key or upsert on this endpoint.
 */
const addColumn: ActionDefinition<Input, GenericResult> = {
  key: "add-column",
  type: "perform",
  resource: "column",
  title: "Add Column",
  description: "Add a column to a sheet at a given 0-based index.",
  idempotent: false,
  params: [
    { key: "sheetId", label: "Sheet ID", type: "string", required: true },
    { key: "title", label: "Column title", type: "string", required: true },
    {
      key: "type",
      label: "Column type",
      type: "select",
      required: true,
      options: [
        { value: "TEXT_NUMBER", label: "Text/Number" },
        { value: "CHECKBOX", label: "Checkbox" },
        { value: "PICKLIST", label: "Dropdown (single select) or symbol" },
        { value: "MULTI_PICKLIST", label: "Dropdown (multi select)" },
        { value: "CONTACT_LIST", label: "Contact list" },
        { value: "MULTI_CONTACT_LIST", label: "Contact list (multi)" },
        { value: "DATE", label: "Date" },
        { value: "DATETIME", label: "Date/Time" },
      ],
    },
    {
      key: "index",
      label: "Index",
      type: "number",
      required: true,
      default: 0,
      hint:
        "0-based position for the new column. Required by the API, not optional. Adding several " +
        "columns in one place means giving them all the same index.",
    },
    {
      key: "options",
      label: "Options",
      type: "json",
      hint: 'For PICKLIST / MULTI_PICKLIST: `["To Do", "In Progress", "Done"]`.',
    },
    {
      key: "symbol",
      label: "Symbol",
      type: "string",
      hint:
        "For a symbol column. CHECKBOX accepts FLAG or STAR; PICKLIST accepts the 25-value symbol " +
        "set (RYG, PRIORITY, PROGRESS, HEARTS, STAR_RATING, …).",
    },
    { key: "description", label: "Description", type: "text" },
    { key: "width", label: "Width", type: "number", hint: "Display width in pixels." },
    { key: "hidden", label: "Hidden", type: "boolean" },
    {
      key: "locked",
      label: "Locked",
      type: "boolean",
      hint: "Locking a column needs owner or admin permission on the sheet.",
    },
    { key: "validation", label: "Validation", type: "boolean" },
  ],
  output: [
    { key: "message", type: "string", label: "SUCCESS" },
    { key: "resultCode", type: "number", label: "0 on success" },
    { key: "result", type: "object", label: "The created Column, including its new id" },
  ],

  execute(input, ctx) {
    const body = compact({
      title: input.title,
      type: input.type,
      index: input.index,
      options: input.options,
      symbol: input.symbol,
      description: input.description,
      width: input.width,
      hidden: input.hidden,
      locked: input.locked,
      validation: input.validation,
    });

    return new SmartsheetClient(ctx).request<GenericResult>(
      `/sheets/${encodeURIComponent(input.sheetId)}/columns`,
      { method: "POST", body },
    );
  },
};

export default addColumn;

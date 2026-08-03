import type { ActionDefinition } from "@w6w/types";
import {
  type IndexResult,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  SmartsheetClient,
} from "../lib/client.ts";

interface Input extends PageInput {
  sheetId: string;
  level?: number;
}

/**
 * `GET /sheets/{sheetId}/columns` — the sheet's columns.
 *
 * **This is the lookup table every write in this app depends on.** Cells carry
 * `columnId` and nothing else; the mapping from a human column title to that id
 * exists only here (or inside a Get Sheet response). A workflow that writes
 * cells should call this once per sheet, build `title → id`, and reuse it — the
 * ids are stable for the life of the column, so this does not belong inside a
 * per-row loop.
 *
 * Each Column carries `id`, `title`, `type`, `index` (0-based position),
 * `primary` (present only when true), plus `options` for a PICKLIST and `symbol`
 * for a symbol column.
 */
const listColumns: ActionDefinition<Input, IndexResult> = {
  key: "list-columns",
  type: "read",
  resource: "column",
  title: "List Columns",
  description:
    "List a sheet's columns. Use this to resolve column titles to the column IDs that every cell " +
    "read and write is keyed by.",
  params: [
    { key: "sheetId", label: "Sheet ID", type: "string", required: true },
    {
      key: "level",
      label: "Level",
      type: "select",
      options: [
        { value: 0, label: "0 — text/number for multi-contact and multi-picklist (default)" },
        { value: 1, label: "1 — multi-contact columns" },
        { value: 2, label: "2 — multi-contact and multi-picklist columns" },
      ],
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new SmartsheetClient(ctx).request<IndexResult>(
      `/sheets/${encodeURIComponent(input.sheetId)}/columns`,
      { query: { level: input.level, ...pageQuery(input) } },
    );
  },
};

export default listColumns;

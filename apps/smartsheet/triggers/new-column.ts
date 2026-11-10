import type { Param } from "@w6w/types";
import listColumns from "../actions/list-columns.ts";
import { readPages, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c) of one sheet the user picks. `GET /sheets/{sheetId}/columns` lists a
 * sheet's columns with `page`/`pageSize`; a sheet holds at most a few hundred columns, so the whole
 * list is read (up to 10 pages of 100) (https://developers.smartsheet.com/_spec/api/smartsheet/openapi.yaml,
 * `list-columns`).
 */
export default snapshotTrigger<{ sheetId: string }>({
  key: "new-column",
  title: "New Column",
  description: "The run gets each column newly added to the selected sheet.",
  params: (listColumns.params ?? []).filter((p) => p.key === "sheetId") as Param[],
  output: [
    { key: "id", type: "number", label: "Column ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "Column type" },
    { key: "index", type: "number", label: "Position" },
  ],
  sample: { id: 7960873114331012, title: "Status", type: "PICKLIST", index: 2 },
  rows: (p, ctx) => readPages("new-column", listColumns, { sheetId: p.sheetId }, ctx),
  idOf: (r) => String(r.id),
});

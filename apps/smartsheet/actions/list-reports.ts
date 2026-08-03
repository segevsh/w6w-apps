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
  modifiedSince?: string;
}

/**
 * `GET /reports` — reports the user can access.
 *
 * A Report in Smartsheet is a saved cross-sheet view: it has its own `columns`
 * and `rows`, but they are projections of the source sheets, and its column ids
 * are `virtualId`s rather than real column ids. That difference is why this app
 * lists reports but does not write to them — the row/cell write path here is
 * built on real `columnId`s, and pointing it at a report would be wrong in a way
 * that is hard to see from the outside.
 *
 * `modifiedSince` is the only filter the operation declares. Page and page size
 * are honoured (the response is an `IndexResult`), and for report ROWS
 * specifically the spec notes a 10,000-row ceiling per request.
 */
const listReports: ActionDefinition<Input, IndexResult> = {
  key: "list-reports",
  type: "read",
  resource: "report",
  title: "List Reports",
  description:
    "List reports the connected user can access, by id, name, access level and summary-report " +
    "flag. Reports are read-only here — their columns are virtual, not real sheet columns.",
  params: [
    {
      key: "modifiedSince",
      label: "Modified since",
      type: "datetime",
      hint: "ISO-8601. Only reports modified on or after this instant.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new SmartsheetClient(ctx).request<IndexResult>("/reports", {
      query: { modifiedSince: input.modifiedSince, ...pageQuery(input) },
    });
  },
};

export default listReports;

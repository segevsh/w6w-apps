import type { ActionDefinition } from "@w6w/types";
import {
  csv,
  type IndexResult,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  SmartsheetClient,
} from "../lib/client.ts";

interface Input extends PageInput {
  include?: string[];
  modifiedSince?: string;
}

/**
 * `GET /sheets` — every sheet the token's user can access.
 *
 * The response holds an ABBREVIATED Sheet per entry ("The list contains an
 * abbreviated Sheet object for each sheet"): id, name, accessLevel, permalink,
 * createdAt/modifiedAt. No columns and no rows. Use Get Sheet for those — this
 * endpoint is the id lookup, not a bulk export.
 *
 * `include` here is NOT the rich sheet-level include list. The OpenAPI document
 * gives this operation its own two-value enum, `sheetVersion` and `source`, and
 * warns that `sheetVersion` "should not be combined with pagination".
 */
const listSheets: ActionDefinition<Input, IndexResult> = {
  key: "list-sheets",
  type: "read",
  resource: "sheet",
  title: "List Sheets",
  description:
    "List every sheet the connected user can access, as abbreviated Sheet objects (id, name, " +
    "access level, permalink). Use Get Sheet to read columns and rows.",
  params: [
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "sheetVersion", label: "Sheet version — should not be combined with pagination" },
        { value: "source", label: "Source — the object each sheet was created from, if any" },
      ],
      hint:
        "Only these two values are valid on this endpoint. The richer include list (attachments, " +
        "discussions, format, …) belongs to Get Sheet, not here.",
    },
    {
      key: "modifiedSince",
      label: "Modified since",
      type: "datetime",
      hint: "ISO-8601. Returns only sheets modified on or after this instant.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new SmartsheetClient(ctx).request<IndexResult>("/sheets", {
      query: {
        include: csv(input.include),
        modifiedSince: input.modifiedSince,
        ...pageQuery(input),
      },
    });
  },
};

export default listSheets;

import type { ActionDefinition } from "@w6w/types";
import { csv, type GenericResult, SmartsheetClient } from "../lib/client.ts";

interface Input {
  sheetId: string;
  rowIds: string | string[];
  ignoreRowsNotFound?: boolean;
}

/**
 * `DELETE /sheets/{sheetId}/rows?ids=…` — delete one or more rows.
 *
 * The ids go in the QUERY STRING, not in a body: the operation declares a
 * required `ids` parameter, "A comma-separated list of row Ids". There is no
 * request body on this endpoint.
 *
 * `ignoreRowsNotFound` defaults to **false**, and the default is the dangerous
 * one for a retry: "If set to false and any of the specified row Ids are not
 * found, no rows are deleted, and the 'not found' error is returned." So a
 * second delete of the same ids fails rather than being a no-op.
 *
 * That is why this action is marked **idempotent: true** but defaults
 * `ignoreRowsNotFound` to `true`. Deleting an already-deleted row is the exact
 * situation a retry produces, and treating it as an error turns a harmless
 * replay into a failed workflow. The flag is exposed so a caller who genuinely
 * wants "fail if any id is missing" can ask for it — and the hint says that
 * choice costs idempotency.
 *
 * One thing the response makes explicit and a caller should not be surprised by:
 * the result contains the ids of "all rows that were successfully deleted
 * (**including any child rows** of rows specified in the URL)". Deleting a
 * parent deletes its subtree.
 */
const deleteRows: ActionDefinition<Input, GenericResult<number[]>> = {
  key: "delete-rows",
  type: "perform",
  resource: "row",
  title: "Delete Rows",
  description:
    "Delete rows by id. Deleting a parent row also deletes its child rows, and the response lists " +
    "every id actually removed.",
  idempotent: true,
  params: [
    { key: "sheetId", label: "Sheet ID", type: "string", required: true },
    {
      key: "rowIds",
      label: "Row IDs",
      type: "string",
      required: true,
      hint: "Comma-separated row ids, or a list. Sent as the required `ids` query parameter.",
    },
    {
      key: "ignoreRowsNotFound",
      label: "Ignore rows not found",
      type: "boolean",
      default: true,
      hint: "Smartsheet's own default is false, which deletes NOTHING and errors if any id is " +
        "missing. This action defaults it to true so a retry of an already-applied delete " +
        "succeeds. Set it false to make a missing id a hard error — at the cost of idempotency.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "SUCCESS" },
    { key: "resultCode", type: "number", label: "0 on success" },
    { key: "result", type: "array", label: "Ids of every row deleted, including child rows" },
  ],

  execute(input, ctx) {
    const ids = csv(input.rowIds);
    if (!ids) throw new Error("rowIds is required — at least one row id must be given");

    return new SmartsheetClient(ctx).request<GenericResult<number[]>>(
      `/sheets/${encodeURIComponent(input.sheetId)}/rows`,
      {
        method: "DELETE",
        query: {
          ids,
          ignoreRowsNotFound: input.ignoreRowsNotFound === false ? undefined : true,
        },
      },
    );
  },
};

export default deleteRows;

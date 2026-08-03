import type { ActionDefinition } from "@w6w/types";
import {
  GraphClient,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { sessionIdParam, workbookParams, worksheetParam } from "../lib/params.ts";

interface Input extends WorkbookRef {
  worksheet: string;
  sessionId?: string;
}

/**
 * `DELETE /me/drive/items/{id}/workbook/worksheets/{id|name}`
 * `DELETE /me/drive/root:/{item-path}:/workbook/worksheets/{id|name}`
 *
 * https://learn.microsoft.com/en-us/graph/api/worksheet-delete
 *
 * Answers `204 No Content`, so there is no body to decode.
 *
 * This deletes the sheet and everything on it, and — unlike deleting a row in
 * the Excel UI — there is no undo on the API side. Run it against a workbook
 * with a persistent session open and the change is saved immediately.
 *
 * Idempotent: it converges on "the sheet is gone". A second call answers `404`,
 * which surfaces as an error rather than a silent success, because a 404 here
 * more often means the caller has the wrong sheet than that the retry worked.
 */
const deleteWorksheet: ActionDefinition<Input, { status: number }> = {
  key: "delete-worksheet",
  type: "perform",
  resource: "worksheet",
  title: "Delete Worksheet",
  description: "Delete a worksheet and everything on it. There is no undo.",
  idempotent: true,
  params: [
    ...workbookParams(),
    worksheetParam(),
    sessionIdParam,
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx): Promise<{ status: number }> {
    const client = new GraphClient(ctx);
    ctx.log("warn", "deleting worksheet", { worksheet: input.worksheet });
    return await client.status(
      `${workbookPath(input)}/worksheets/${segment(input.worksheet)}`,
      { method: "DELETE", headers: sessionHeaders(input.sessionId) },
    );
  },
};

export default deleteWorksheet;

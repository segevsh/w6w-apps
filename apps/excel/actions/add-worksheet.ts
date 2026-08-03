import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  GraphClient,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { sessionIdParam, workbookParams } from "../lib/params.ts";

interface Input extends WorkbookRef {
  name?: string;
  sessionId?: string;
}

interface Worksheet {
  id?: string;
  name?: string;
  position?: number;
  visibility?: string;
}

/**
 * `POST /me/drive/items/{id}/workbook/worksheets/add`
 * `POST /me/drive/root:/{item-path}:/workbook/worksheets/add`
 *
 * https://learn.microsoft.com/en-us/graph/api/worksheetcollection-add
 *
 * Note the `/add` suffix. The conceptual overview shows a bare
 * `POST …/workbook/worksheets`; the reference page for the operation is the
 * `/add` form, and that is what this uses.
 *
 * `name` is optional — Excel picks one if you omit it — but it must be unique
 * when supplied. The sheet is always appended at the end; use Update Worksheet
 * to move it.
 *
 * Not idempotent: a retry with the same name fails with `ItemAlreadyExists`, and
 * a retry without a name creates a second sheet. Graph offers no
 * client-supplied dedupe key here.
 */
const addWorksheet: ActionDefinition<Input, Worksheet> = {
  key: "add-worksheet",
  type: "perform",
  resource: "worksheet",
  title: "Add Worksheet",
  description: "Add a worksheet to the end of a workbook.",
  idempotent: false,
  params: [
    ...workbookParams(),
    {
      key: "name",
      label: "Worksheet name",
      type: "string",
      placeholder: "Q3 Summary",
      hint:
        "Must be unique in the workbook. Leave empty and Excel names it (`Sheet1`, `Sheet2`, …).",
    },
    sessionIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Worksheet ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "position", type: "number", label: "Position" },
    { key: "visibility", type: "string", label: "Visibility" },
  ],

  async execute(input, ctx): Promise<Worksheet> {
    const client = new GraphClient(ctx);
    return await client.request<Worksheet>(`${workbookPath(input)}/worksheets/add`, {
      method: "POST",
      body: compact({ name: input.name?.trim() || undefined }),
      headers: sessionHeaders(input.sessionId),
    });
  },
};

export default addWorksheet;

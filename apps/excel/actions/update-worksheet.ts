import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  GraphClient,
  segment,
  sessionHeaders,
  workbookPath,
  type WorkbookRef,
} from "../lib/client.ts";
import { sessionIdParam, workbookParams, worksheetParam } from "../lib/params.ts";

interface Input extends WorkbookRef {
  worksheet: string;
  name?: string;
  position?: number;
  visibility?: string;
  sessionId?: string;
}

interface Worksheet {
  id?: string;
  name?: string;
  position?: number;
  visibility?: string;
}

/**
 * `PATCH /me/drive/items/{id}/workbook/worksheets/{id|name}`
 * `PATCH /me/drive/root:/{item-path}:/workbook/worksheets/{id|name}`
 *
 * https://learn.microsoft.com/en-us/graph/api/worksheet-update
 *
 * Renames, repositions or hides a sheet. `visibility` is the enum from the
 * `workbookWorksheet` resource: `Visible`, `Hidden`, `VeryHidden` — the last
 * being the one a user cannot unhide from the Excel UI.
 *
 * Only the properties actually supplied are sent, so a PATCH that sets the
 * position does not silently reset the name.
 *
 * Idempotent: the request describes an end state, and replaying it converges on
 * the same one. Address the sheet by `id` if you intend to retry a rename — a
 * retry addressed by the *old* name would 404 after the first success.
 */
const updateWorksheet: ActionDefinition<Input, Worksheet> = {
  key: "update-worksheet",
  type: "perform",
  resource: "worksheet",
  title: "Update Worksheet",
  description: "Rename, reposition or change the visibility of a worksheet.",
  idempotent: true,
  params: [
    ...workbookParams(),
    worksheetParam(),
    { key: "name", label: "New name", type: "string", hint: "Must be unique in the workbook." },
    {
      key: "position",
      label: "Position",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Zero-based position among the worksheets.",
    },
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "Visible", label: "Visible" },
        { value: "Hidden", label: "Hidden" },
        { value: "VeryHidden", label: "Very hidden (not unhideable from the Excel UI)" },
      ],
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
    const body = compact({
      name: input.name?.trim() || undefined,
      position: input.position,
      visibility: input.visibility,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update: set at least one of New name, Position or Visibility.");
    }

    const client = new GraphClient(ctx);
    return await client.request<Worksheet>(
      `${workbookPath(input)}/worksheets/${segment(input.worksheet)}`,
      { method: "PATCH", body, headers: sessionHeaders(input.sessionId) },
    );
  },
};

export default updateWorksheet;

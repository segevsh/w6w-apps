import type { ActionDefinition } from "@w6w/types";
import { csv, type GenericResult, SmartsheetClient, toId } from "../lib/client.ts";

interface Input {
  name: string;
  columns: unknown[];
  workspaceId?: string;
  folderId?: string;
  fromTemplateId?: string;
  include?: string[];
}

/**
 * Create a sheet — into a workspace, a folder, or (legacy) the user's Sheets
 * folder.
 *
 * ## Three endpoints, one action, and why
 *
 * Smartsheet has no single "create sheet" path. The destination picks the path:
 *
 *   - `POST /workspaces/{workspaceId}/sheets` — "Create sheet in workspace"
 *   - `POST /folders/{folderId}/sheets`       — "Create sheet in folder"
 *   - `POST /sheets`                          — "Create sheet in \"Sheets\" folder",
 *     and the OpenAPI document marks this one **DEPRECATED**: "The Sheets folder
 *     is being replaced by workspaces."
 *
 * Splitting these into three actions would make the deprecated one look like a
 * peer of the other two. One action with a destination is the honest shape: give
 * a workspace id or a folder id and you get the supported path; give neither and
 * you get the deprecated one, and the hint says so.
 *
 * ## The body
 *
 * `SheetToCreate` is `{ name, columns[] }` and nothing else. Each column needs at
 * least `title` and `type`; exactly one column should carry `"primary": true`.
 * Valid `type` values for a NEW sheet, per the `ColumnToCreateASheet` union:
 * `TEXT_NUMBER`, `CHECKBOX`, `PICKLIST`, `MULTI_PICKLIST`, `CONTACT_LIST`,
 * `MULTI_CONTACT_LIST`, `DATE`, `DATETIME`. A `PICKLIST` column carries
 * `options: []`; a symbol column carries `symbol` (`STAR`, `RYG`, `PRIORITY`,
 * `PROGRESS`, … 25 values in total).
 *
 * `fromTemplateId` switches the body to `SheetToCreateFromTemplate` and enables
 * the `include` param, whose eight values name what to copy from the template.
 *
 * Not idempotent: Smartsheet mints a new sheet id per call and offers no
 * idempotency key, so a retry creates a second sheet.
 */
const createSheet: ActionDefinition<Input, GenericResult> = {
  key: "create-sheet",
  type: "perform",
  resource: "sheet",
  title: "Create Sheet",
  description:
    "Create a sheet in a workspace, in a folder, or from a template. Give a Workspace ID or a " +
    "Folder ID to choose the destination — with neither, the sheet lands in the deprecated " +
    "top-level Sheets folder.",
  idempotent: false,
  params: [
    { key: "name", label: "Sheet name", type: "string", required: true },
    {
      key: "columns",
      label: "Columns",
      type: "json",
      required: true,
      hint: 'Array of column definitions, e.g. `[{"title": "Task", "type": "TEXT_NUMBER", ' +
        '"primary": true}, {"title": "Status", "type": "PICKLIST", "options": ["To Do", "Done"]}]`. ' +
        "Types: TEXT_NUMBER, CHECKBOX, PICKLIST, MULTI_PICKLIST, CONTACT_LIST, MULTI_CONTACT_LIST, " +
        'DATE, DATETIME. Exactly one column should be `"primary": true`. Ignored when creating ' +
        "from a template.",
    },
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      hint: "Create at the top level of this workspace (`POST /workspaces/{id}/sheets`).",
    },
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint:
        "Create inside this folder (`POST /folders/{id}/sheets`). Ignored if a Workspace ID is " +
        "also given.",
    },
    {
      key: "fromTemplateId",
      label: "From template ID",
      type: "string",
      hint: "Create from a template instead of from column definitions.",
    },
    {
      key: "include",
      label: "Copy from template",
      type: "multiselect",
      options: [
        { value: "attachments", label: "attachments" },
        { value: "cellLinks", label: "cellLinks" },
        { value: "data", label: "data" },
        { value: "discussions", label: "discussions" },
        { value: "filters", label: "filters" },
        { value: "forms", label: "forms" },
        { value: "ruleRecipients", label: "ruleRecipients" },
        { value: "rules", label: "rules" },
      ],
      hint: "Only meaningful together with From template ID.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "SUCCESS or PARTIAL_SUCCESS" },
    { key: "resultCode", type: "number", label: "0 on success" },
    { key: "result", type: "object", label: "The created Sheet" },
  ],

  execute(input, ctx) {
    const path = input.workspaceId
      ? `/workspaces/${encodeURIComponent(input.workspaceId)}/sheets`
      : input.folderId
      ? `/folders/${encodeURIComponent(input.folderId)}/sheets`
      : "/sheets";

    const body = input.fromTemplateId
      ? { name: input.name, fromId: toId(input.fromTemplateId, "fromTemplateId") }
      : { name: input.name, columns: input.columns };

    return new SmartsheetClient(ctx).request<GenericResult>(path, {
      method: "POST",
      query: { include: input.fromTemplateId ? csv(input.include) : undefined },
      body,
    });
  },
};

export default createSheet;

import type { ActionDefinition } from "@w6w/types";
import { csv, type PaginatedChildren, SmartsheetClient } from "../lib/client.ts";

interface Input {
  container: "workspace" | "folder";
  containerId: string;
  childrenResourceTypes?: string[];
  include?: string[];
  maxItems?: number;
  lastKey?: string;
}

/**
 * `GET /workspaces/{workspaceId}/children` and `GET /folders/{folderId}/children`
 * — what is inside a workspace or a folder.
 *
 * ## This is how you list folders
 *
 * There is no `GET /folders` and, in the current API, no `GET /folders/{id}`
 * either — that path declares only `PUT` and `DELETE`. Folder metadata moved to
 * `GET /folders/{id}/metadata`, and folder CONTENTS to `.../children`. The old
 * `GET /home/folders` still exists but is marked **DEPRECATED** in the spec:
 * "The Sheets folder is being replaced by workspaces." So the supported answer to
 * "list my folders" is: list a workspace's children filtered to `folders`, then
 * walk down. This action is that, for both container kinds, because they take
 * byte-identical parameters and returning two near-duplicate actions would only
 * make the caller pick.
 *
 * Both are token-paged (`maxItems` / `lastKey`), like List Workspaces and unlike
 * everything else. `maxItems` must be a multiple of 100 between 100 and 1000.
 *
 * One documented gotcha, carried into the hint: "When `templates` is included,
 * you must also include `sheets` in `childrenResourceTypes` since templates are
 * sheet templates."
 */
const listContainerChildren: ActionDefinition<Input, PaginatedChildren> = {
  key: "list-container-children",
  type: "read",
  resource: "workspace",
  title: "List Container Children",
  description:
    "List the sheets, reports, dashboards, folders and templates inside a workspace or a folder. " +
    "This is the supported way to enumerate folders — there is no standalone list-folders endpoint.",
  params: [
    {
      key: "container",
      label: "Container",
      type: "select",
      required: true,
      default: "workspace",
      options: [
        { value: "workspace", label: "Workspace" },
        { value: "folder", label: "Folder" },
      ],
    },
    { key: "containerId", label: "Container ID", type: "string", required: true },
    {
      key: "childrenResourceTypes",
      label: "Child types",
      type: "multiselect",
      options: [
        { value: "sheets", label: "sheets" },
        { value: "reports", label: "reports" },
        { value: "sights", label: "sights (dashboards)" },
        { value: "folders", label: "folders" },
        { value: "templates", label: "templates — requires `sheets` as well" },
      ],
      hint: "Omit for everything. `templates` is only valid alongside `sheets`.",
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "source", label: "source — what each resource was created from" },
        { value: "ownerInfo", label: "ownerInfo — the owning or admin user" },
      ],
    },
    {
      key: "maxItems",
      label: "Max items",
      type: "number",
      validation: { min: 100, max: 1000, integer: true },
      hint: "100 to 1000, in multiples of 100. Default 100.",
    },
    {
      key: "lastKey",
      label: "Last key",
      type: "string",
      hint: "The `lastKey` from the previous response. Omit for the first page.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Child asset references" },
    { key: "lastKey", type: "string", label: "Token for the next page; absent at the end" },
  ],

  execute(input, ctx) {
    const base = input.container === "folder" ? "/folders" : "/workspaces";
    return new SmartsheetClient(ctx).request<PaginatedChildren>(
      `${base}/${encodeURIComponent(input.containerId)}/children`,
      {
        query: {
          childrenResourceTypes: csv(input.childrenResourceTypes),
          include: csv(input.include),
          maxItems: input.maxItems,
          lastKey: input.lastKey,
        },
      },
    );
  },
};

export default listContainerChildren;

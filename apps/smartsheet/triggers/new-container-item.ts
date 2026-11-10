import type { Param } from "@w6w/types";
import listContainerChildren from "../actions/list-container-children.ts";
import { readTokens, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c) of one workspace or folder the user picks. `GET /workspaces/{id}/children`
 * and `GET /folders/{id}/children` are token-paged (`maxItems`, `lastKey`) and return sheets, reports,
 * dashboards, folders and templates with `id`, `name`, `permalink`, `createdAt`, `modifiedAt` and
 * `resourceType` (https://developers.smartsheet.com/_spec/api/smartsheet/openapi.yaml,
 * `PaginatedChildrenResponse`). The container is read whole (up to 10 pages of 100); ids are keyed
 * together with `resourceType`.
 */
export default snapshotTrigger<{ container: "workspace" | "folder"; containerId: string }>({
  key: "new-container-item",
  title: "New Item in Workspace or Folder",
  description:
    "The run gets each sheet, report, dashboard, folder or template newly added to the selected workspace or folder.",
  params: (listContainerChildren.params ?? []).filter((p) =>
    p.key === "container" || p.key === "containerId"
  ) as Param[],
  output: [
    { key: "id", type: "number", label: "Item ID" },
    { key: "resourceType", type: "string", label: "Type (sheet, report, sight, folder, template)" },
    { key: "name", type: "string", label: "Name" },
    { key: "permalink", type: "string", label: "Link" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "modifiedAt", type: "string", label: "Modified at" },
  ],
  sample: {
    id: 4583173393803140,
    resourceType: "sheet",
    name: "Project plan",
    permalink: "https://app.smartsheet.com/sheets/sample-sheet",
    createdAt: "2026-11-09T09:00:00Z",
    modifiedAt: "2026-11-09T09:00:00Z",
  },
  rows: (p, ctx) =>
    readTokens("new-container-item", listContainerChildren, {
      container: p.container,
      containerId: p.containerId,
    }, ctx),
  idOf: (r) => `${r.resourceType ?? ""}:${r.id}`,
});

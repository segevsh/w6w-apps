import listWorkspaces from "../actions/list-workspaces.ts";
import { readTokens, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c). `GET /workspaces` is token-paged (`maxItems` 100 to 1000, `lastKey`) and
 * documents no order; the workspaces the user can access are a small set, read whole (up to 10 pages of
 * 100) (https://developers.smartsheet.com/_spec/api/smartsheet/openapi.yaml, `list-workspaces`).
 */
export default snapshotTrigger({
  key: "new-workspace",
  title: "New Workspace",
  description: "The run gets each workspace that newly becomes accessible to the connected user.",
  output: [
    { key: "id", type: "number", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "accessLevel", type: "string", label: "Access level" },
    { key: "permalink", type: "string", label: "Link" },
  ],
  sample: {
    id: 7116448184199044,
    name: "Marketing",
    accessLevel: "OWNER",
    permalink: "https://app.smartsheet.com/workspaces/sample-workspace",
  },
  rows: (_p, ctx) => readTokens("new-workspace", listWorkspaces, {}, ctx),
  idOf: (r) => String(r.id),
});

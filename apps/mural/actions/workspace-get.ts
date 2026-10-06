import type { ActionDefinition } from "@w6w/types";
import { encodeId, one } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/**
 * `GET /workspaces/{workspaceId}` (Mural public API v1). OAuth scope: `workspaces:read`.
 */
type Input = {
  workspaceId: string;
};

const workspaceGet: ActionDefinition<Input> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description: "Fetch one workspace. Needs the `workspaces:read` OAuth scope.",
  params: [
    str("workspaceId", "Workspace ID", {
      required: true,
      hint: "The workspace ID, e.g. from List Workspaces.",
    }),
  ],
  output: [
    { key: "id", type: "string", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "locked", type: "boolean", label: "Locked" },
    { key: "suspended", type: "boolean", label: "Suspended" },
  ],

  execute(input, ctx) {
    return one(ctx, "GET", `/workspaces/${encodeId(input.workspaceId)}`);
  },
};

export default workspaceGet;

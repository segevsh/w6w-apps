import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/workspaces/update`
 *
 * Rename a workspace.
 */
interface Input {
  workspaceId: number;
  name?: string;
}

const workspaceUpdate: ActionDefinition<Input> = {
  key: "workspace-update",
  type: "perform",
  resource: "workspace",
  title: "Update Workspace",
  description: "Rename a workspace.",
  idempotent: true,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
    { key: "name", label: "Name", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/workspaces/update",
      params: { "id": input.workspaceId, "name": input.name },
    });
  },
};

export default workspaceUpdate;

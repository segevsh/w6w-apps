import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/workspaces/getone`
 *
 * Get a workspace by id.
 */
interface Input {
  workspaceId: number;
}

const workspaceGet: ActionDefinition<Input> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description: "Get a workspace by id.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/workspaces/getone",
      params: { "id": input.workspaceId },
    });
  },
};

export default workspaceGet;

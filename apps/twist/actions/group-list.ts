import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/groups/get`
 *
 * List all groups in a workspace.
 */
interface Input {
  workspaceId: number;
}

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "read",
  resource: "group",
  title: "List Groups",
  description: "List all groups in a workspace.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/groups/get",
      params: { "workspace_id": input.workspaceId },
    });
  },
};

export default groupList;

import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/url_join/get_only`
 *
 * Get the URL join link of a workspace, if one exists.
 */
interface Input {
  workspaceId: number;
}

const urlJoinGet: ActionDefinition<Input> = {
  key: "url-join-get",
  type: "read",
  resource: "workspace",
  title: "Get Join Link",
  description: "Get the URL join link of a workspace, if one exists.",
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
    {
      key: "result",
      type: "string",
      label: "Twist's response when it is not an object (normally empty)",
    },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/url_join/get_only",
      params: { "workspace_id": input.workspaceId },
    });
  },
};

export default urlJoinGet;

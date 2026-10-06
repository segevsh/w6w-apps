import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/url_join/get_or_create`
 *
 * Get a workspace's URL join link, creating it if needed.
 */
interface Input {
  workspaceId: number;
}

const urlJoinGetOrCreate: ActionDefinition<Input> = {
  key: "url-join-get-or-create",
  type: "perform",
  resource: "workspace",
  title: "Get or Create Join Link",
  description: "Get a workspace's URL join link, creating it if needed.",
  idempotent: true,
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
      method: "POST",
      path: "/url_join/get_or_create",
      params: { "workspace_id": input.workspaceId },
    });
  },
};

export default urlJoinGetOrCreate;

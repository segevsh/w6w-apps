import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/channels/get`
 *
 * List all channels in a workspace.
 */
interface Input {
  workspaceId: number;
  archived?: boolean;
}

const channelList: ActionDefinition<Input> = {
  key: "channel-list",
  type: "read",
  resource: "channel",
  title: "List Channels",
  description: "List all channels in a workspace.",
  params: [
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "number",
      required: true,
      hint: "Twist workspace (team) id.",
    },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      hint: "Return only archived channels. Off by default.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/channels/get",
      params: { "workspace_id": input.workspaceId, "archived": input.archived },
    });
  },
};

export default channelList;

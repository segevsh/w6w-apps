import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/workspaces/get_public_channels`
 *
 * List the public channels of a workspace.
 */
interface Input {
  workspaceId: number;
}

const workspacePublicChannelsList: ActionDefinition<Input> = {
  key: "workspace-public-channels-list",
  type: "read",
  resource: "workspace",
  title: "List Public Channels",
  description: "List the public channels of a workspace.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "number", required: true },
  ],
  output: [
    { key: "items", type: "array", label: "Returned objects" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/workspaces/get_public_channels",
      params: { "id": input.workspaceId },
    });
  },
};

export default workspacePublicChannelsList;

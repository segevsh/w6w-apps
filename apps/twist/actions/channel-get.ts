import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `GET /api/v3/channels/getone`
 *
 * Get a channel by id.
 */
interface Input {
  channelId: number;
}

const channelGet: ActionDefinition<Input> = {
  key: "channel-get",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Get a channel by id.",
  params: [
    { key: "channelId", label: "Channel ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Channel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "workspace_id", type: "number", label: "Workspace ID" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "GET",
      path: "/channels/getone",
      params: { "id": input.channelId },
    });
  },
};

export default channelGet;

import type { ActionDefinition } from "@w6w/types";
import { seg, SUCCESS, type Success, ZohoCliqClient } from "../lib/client.ts";
import { channelId } from "../lib/params.ts";

interface Input {
  channelId: string;
}

/** `DELETE /api/v2/channels/{CHANNEL_ID}` — scope `ZohoCliq.Channels.DELETE`; `204`. */
const channelDelete: ActionDefinition<Input, Success> = {
  key: "channel-delete",
  type: "perform",
  resource: "channel",
  title: "Delete Channel",
  description: "Permanently delete a channel.",
  idempotent: true,
  params: [channelId],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new ZohoCliqClient(ctx).request(`/channels/${seg(input.channelId)}`, {
      method: "DELETE",
    });
    return SUCCESS;
  },
};

export default channelDelete;

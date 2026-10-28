import type { ActionDefinition } from "@w6w/types";
import { seg, SUCCESS, type Success, ZohoCliqClient } from "../lib/client.ts";
import { channelId } from "../lib/params.ts";

interface Input {
  channelId: string;
}

/** `POST /api/v2/channels/{CHANNEL_ID}/leave` — scope `ZohoCliq.Channels.UPDATE`; `204`. */
const channelLeave: ActionDefinition<Input, Success> = {
  key: "channel-leave",
  type: "perform",
  resource: "channel",
  title: "Leave Channel",
  description: "Leave a channel as the user who authorized the connection.",
  idempotent: true,
  params: [channelId],
  output: [{ key: "success", type: "boolean", label: "Left" }],

  async execute(input, ctx) {
    await new ZohoCliqClient(ctx).request(`/channels/${seg(input.channelId)}/leave`, {
      method: "POST",
    });
    return SUCCESS;
  },
};

export default channelLeave;

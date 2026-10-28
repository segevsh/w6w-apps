import type { ActionDefinition } from "@w6w/types";
import { seg, unwrapData, ZohoCliqClient } from "../lib/client.ts";
import { channelId } from "../lib/params.ts";

interface Input {
  channelId: string;
}

interface Output {
  channel: Record<string, unknown>;
}

/**
 * `POST /api/v2/channels/{CHANNEL_ID}/join` — scope `ZohoCliq.Channels.UPDATE`.
 * Unlike every other membership mutation this one answers with the channel
 * object, not `204`.
 */
const channelJoin: ActionDefinition<Input, Output> = {
  key: "channel-join",
  type: "perform",
  resource: "channel",
  title: "Join Channel",
  description: "Join a channel as the user who authorized the connection.",
  idempotent: true,
  params: [channelId],
  output: [{ key: "channel", type: "object", label: "Channel" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request(
      `/channels/${seg(input.channelId)}/join`,
      { method: "POST" },
    );
    return { channel: unwrapData(body) };
  },
};

export default channelJoin;

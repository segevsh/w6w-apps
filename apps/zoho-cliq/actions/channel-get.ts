import type { ActionDefinition } from "@w6w/types";
import { seg, unwrapData, ZohoCliqClient } from "../lib/client.ts";
import { channelId } from "../lib/params.ts";

interface Input {
  channelId: string;
}

interface Output {
  channel: Record<string, unknown>;
}

/** `GET /api/v2/channels/{CHANNEL_ID}` — scope `ZohoCliq.Channels.READ`. */
const channelGet: ActionDefinition<Input, Output> = {
  key: "channel-get",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Get one channel's details, including its unique name and chat id.",
  params: [channelId],
  output: [{ key: "channel", type: "object", label: "Channel" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request(`/channels/${seg(input.channelId)}`);
    return { channel: unwrapData(body) };
  },
};

export default channelGet;

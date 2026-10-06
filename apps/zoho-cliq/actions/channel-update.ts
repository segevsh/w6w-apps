import type { ActionDefinition } from "@w6w/types";
import { compact, seg, unwrapData, ZohoCliqClient } from "../lib/client.ts";
import { channelId } from "../lib/params.ts";

interface Input {
  channelId: string;
  name?: string;
  description?: string;
  config?: Record<string, unknown>;
}

interface Output {
  channel: Record<string, unknown>;
}

/**
 * `PUT /api/v2/channels/{CHANNEL_ID}` — scope `ZohoCliq.Channels.UPDATE`.
 * `config` keys per the reference: `reply_mode` (normal_reply | threads |
 * both), `leave_join_info` (enable | disable), `add_remove_info` (enable |
 * disable), `meeting_chat_type` (channel | thread | host_choice).
 */
const channelUpdate: ActionDefinition<Input, Output> = {
  key: "channel-update",
  type: "perform",
  resource: "channel",
  title: "Update Channel",
  description: "Rename a channel, change its description or its configuration settings.",
  idempotent: true,
  params: [
    channelId,
    { key: "name", label: "New name", type: "string" },
    { key: "description", label: "Description", type: "string" },
    {
      key: "config",
      label: "Configuration",
      type: "json",
      hint: 'e.g. { "reply_mode": "threads", "leave_join_info": "disable" }.',
    },
  ],
  output: [{ key: "channel", type: "object", label: "Updated channel" }],

  async execute(input, ctx) {
    const body = compact({
      name: input.name,
      description: input.description,
      config: input.config && Object.keys(input.config).length ? input.config : undefined,
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Provide at least one of name, description or config to update.");
    }
    const res = await new ZohoCliqClient(ctx).request(`/channels/${seg(input.channelId)}`, {
      method: "PUT",
      body,
    });
    return { channel: unwrapData(res) };
  },
};

export default channelUpdate;

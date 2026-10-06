import type { ActionDefinition } from "@w6w/types";
import { seg, ZohoCliqClient } from "../lib/client.ts";
import { channelId } from "../lib/params.ts";

interface Input {
  channelId: string;
}

interface Output {
  members: Array<Record<string, unknown>>;
}

/**
 * `GET /api/v2/channels/{CHANNEL_ID}/members` — scope `ZohoCliq.Channels.READ`;
 * `{ members: [{ user_id, email_id, name, user_role }] }`.
 */
const channelMemberList: ActionDefinition<Input, Output> = {
  key: "channel-member-list",
  type: "read",
  resource: "channel",
  title: "List Channel Members",
  description: "List the members of a channel with their roles.",
  params: [channelId],
  output: [{ key: "members", type: "array", label: "Members" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request<
      { members?: Array<Record<string, unknown>> }
    >(`/channels/${seg(input.channelId)}/members`);
    return { members: body?.members ?? [] };
  },
};

export default channelMemberList;

import type { ActionDefinition } from "@w6w/types";
import { compact, seg, SUCCESS, type Success, toList, ZohoCliqClient } from "../lib/client.ts";
import { channelId } from "../lib/params.ts";

interface Input {
  channelId: string;
  userIds?: string | string[];
  emailIds?: string | string[];
  silent?: boolean;
}

/**
 * `DELETE /api/v2/channels/{CHANNEL_ID}/members` with a JSON body
 * `{ user_ids | email_ids, silent }` — scope `ZohoCliq.Channels.UPDATE`;
 * `204`. At most 100 users per request, 10 requests per minute.
 */
const channelMemberRemove: ActionDefinition<Input, Success> = {
  key: "channel-member-remove",
  type: "perform",
  resource: "channel",
  title: "Remove Channel Members",
  description: "Remove users from a channel by user id or email address (max 100 per call).",
  idempotent: true,
  params: [
    channelId,
    { key: "userIds", label: "User IDs", type: "string", hint: "Comma-separated." },
    { key: "emailIds", label: "Emails", type: "string", hint: "Comma-separated." },
    {
      key: "silent",
      label: "Silent",
      type: "boolean",
      hint: "Do not post a 'user was removed' notice in the channel.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const userIds = toList(input.userIds);
    const emailIds = toList(input.emailIds);
    if (userIds.length === 0 && emailIds.length === 0) {
      throw new Error("Provide at least one user id or email address.");
    }
    if (userIds.length + emailIds.length > 100) {
      throw new Error("Zoho Cliq accepts at most 100 users per request.");
    }
    await new ZohoCliqClient(ctx).request(`/channels/${seg(input.channelId)}/members`, {
      method: "DELETE",
      body: compact({
        user_ids: userIds.length ? userIds : undefined,
        email_ids: emailIds.length ? emailIds : undefined,
        silent: input.silent,
      }),
    });
    return SUCCESS;
  },
};

export default channelMemberRemove;

import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  postOutput,
  type PostResult,
  postResult,
  seg,
  ZohoCliqClient,
} from "../lib/client.ts";
import { markAsRead, replyTo, syncMessage, textParam } from "../lib/params.ts";

interface Input {
  user: string;
  text: string;
  replyTo?: string;
  syncMessage?: boolean;
  markAsRead?: boolean;
}

/**
 * `POST /api/v2/buddies/{EMAIL_ID | ZUID}/message` — direct message, scope
 * `ZohoCliq.Webhooks.CREATE`. Per the reference the target must be a mutual
 * contact or a member of the same organization.
 */
const messagePostUser: ActionDefinition<Input, PostResult> = {
  key: "message-post-user",
  type: "perform",
  resource: "message",
  title: "Send Direct Message",
  description: "Send a direct message to a user by email address or Zoho user id (zuid).",
  idempotent: false,
  params: [
    {
      key: "user",
      label: "User email or ID",
      type: "string",
      required: true,
      hint: "Email address or zuid. Must be a mutual contact or in the same organization.",
    },
    textParam,
    replyTo,
    syncMessage,
    markAsRead,
  ],
  output: [...postOutput],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request(`/buddies/${seg(input.user)}/message`, {
      method: "POST",
      query: compact({ mark_as_read: input.markAsRead }),
      body: compact({
        text: input.text,
        reply_to: input.replyTo,
        sync_message: input.syncMessage,
      }),
    });
    return postResult(body);
  },
};

export default messagePostUser;

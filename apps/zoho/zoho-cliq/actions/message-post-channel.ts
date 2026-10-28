import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  postOutput,
  type PostResult,
  postResult,
  seg,
  ZohoCliqClient,
} from "../lib/client.ts";
import { botUniqueName, markAsRead, replyTo, syncMessage, textParam } from "../lib/params.ts";

interface Input {
  channelId?: string;
  channelUniqueName?: string;
  text: string;
  replyTo?: string;
  syncMessage?: boolean;
  botUniqueName?: string;
  markAsRead?: boolean;
}

/**
 * `POST /api/v2/channels/{CHANNEL_ID}/message` or
 * `POST /api/v2/channelsbyname/{CHANNEL_UNIQUE_NAME}/message` — scope
 * `ZohoCliq.Webhooks.CREATE` (the messaging APIs are gated by the *Webhooks*
 * scope). Body `{ text, reply_to, sync_message }`; query `bot_unique_name`
 * (post as a bot that is already a channel participant) and `mark_as_read`.
 * Answers `204` unless `sync_message=true` (and not as a bot), when the
 * `message_id` comes back.
 */
const messagePostChannel: ActionDefinition<Input, PostResult> = {
  key: "message-post-channel",
  type: "perform",
  resource: "message",
  title: "Post Message to Channel",
  description:
    "Post a message to a channel by channel id or unique name, optionally as a bot or as a reply.",
  idempotent: false,
  params: [
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      hint: "Channel id. Give this or the unique name.",
    },
    {
      key: "channelUniqueName",
      label: "Channel unique name",
      type: "string",
      hint: "The channel's unique name (e.g. `marketing`), from Get Channel.",
    },
    textParam,
    replyTo,
    syncMessage,
    { ...botUniqueName, hint: "Post as this bot (it must already be a participant)." },
    markAsRead,
  ],
  output: [...postOutput],

  async execute(input, ctx) {
    const id = input.channelId?.trim();
    const name = input.channelUniqueName?.trim();
    if (!id && !name) throw new Error("Provide a channel id or a channel unique name.");
    const path = id ? `/channels/${seg(id)}/message` : `/channelsbyname/${seg(name!)}/message`;
    const body = await new ZohoCliqClient(ctx).request(path, {
      method: "POST",
      query: compact({ bot_unique_name: input.botUniqueName, mark_as_read: input.markAsRead }),
      body: compact({
        text: input.text,
        reply_to: input.replyTo,
        sync_message: input.syncMessage,
      }),
    });
    return postResult(body);
  },
};

export default messagePostChannel;

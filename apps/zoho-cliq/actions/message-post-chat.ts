import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  postOutput,
  type PostResult,
  postResult,
  seg,
  ZohoCliqClient,
} from "../lib/client.ts";
import { chatId, markAsRead, replyTo, syncMessage, textParam } from "../lib/params.ts";

interface Input {
  chatId: string;
  text: string;
  replyTo?: string;
  syncMessage?: boolean;
  markAsRead?: boolean;
}

/**
 * `POST /api/v2/chats/{CHAT_ID}/message` — scope `ZohoCliq.Webhooks.CREATE`.
 * Body `{ text, reply_to, sync_message }`. The chat id of a thread works too.
 * With `sync_message=true` the response is `{ message_id }`.
 */
const messagePostChat: ActionDefinition<Input, PostResult> = {
  key: "message-post-chat",
  type: "perform",
  resource: "message",
  title: "Post Message to Chat",
  description: "Post a message to a chat (group chat, direct chat or thread) by chat id.",
  idempotent: false,
  params: [chatId, textParam, replyTo, syncMessage, markAsRead],
  output: [...postOutput],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request(`/chats/${seg(input.chatId)}/message`, {
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

export default messagePostChat;

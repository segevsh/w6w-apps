import type { ActionDefinition } from "@w6w/types";
import { compact, GraphClient, itemBody, seg } from "../lib/client.ts";
import { chatIdParam, messageBodyParams } from "../lib/params.ts";

interface Input {
  chatId: string;
  content: string;
  contentType?: string;
  importance?: string;
}

/**
 * `POST /chats/{chat-id}/messages`
 *
 * https://learn.microsoft.com/en-us/graph/api/chat-post-messages?view=graph-rest-1.0
 *
 * Sends a message into an **existing** one-on-one, group or meeting chat.
 * Answers `201 Created`. Least-privileged delegated scope is `ChatMessage.Send`;
 * this App holds `Chat.ReadWrite`, the documented higher-privileged option, so
 * one scope covers listing, reading and sending. Neither needs admin consent.
 *
 * **It cannot start a chat.** The reference is unambiguous: "This API can't
 * create a new chat; you must use the list chats method to retrieve the ID of an
 * existing chat before you can create a chat message." Creating a chat is
 * `POST /chats`, a different operation with a different body, and it is not
 * implemented here — see the README's "Not implemented".
 *
 * No `subject`: Graph documents `summary` as applying only to channel messages,
 * and a chat message has no title in the Teams UI.
 *
 * `idempotent: false`. No dedupe key; a retry sends the message twice.
 */
const sendChatMessage: ActionDefinition<Input, Record<string, unknown>> = {
  key: "send-chat-message",
  type: "perform",
  resource: "chat-message",
  title: "Send Chat Message",
  description: "Send a message to an existing chat. Cannot create a new chat.",
  idempotent: false,
  params: [chatIdParam, ...messageBodyParams()],
  output: [
    { key: "id", type: "string", label: "Message id" },
    { key: "chatId", type: "string", label: "Chat id" },
    { key: "createdDateTime", type: "string", label: "Created at" },
    { key: "etag", type: "string", label: "ETag" },
  ],

  execute(input, ctx): Promise<Record<string, unknown>> {
    const client = new GraphClient(ctx);
    ctx.log("info", "sending chat message", { chatId: input.chatId });

    return client.request(`/chats/${seg(input.chatId)}/messages`, {
      method: "POST",
      body: compact({
        body: itemBody(input.content, input.contentType),
        importance: input.importance,
      }),
    });
  },
};

export default sendChatMessage;

import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Get Chat — Fetch one chat with its full conversation.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  chatbotId: string;
  chatId: string;
}

const chatbotChatGet: ActionDefinition<Input> = {
  key: "chatbot-chat-get",
  type: "read",
  resource: "chat",
  title: "Get Chat",
  description: "Fetch one chat with its full conversation.",
  params: [
    {
      "key": "chatbotId",
      "label": "Chatbot ID",
      "type": "string",
      "required": true,
      "hint": "The chatbot's public ID (`public_id` from List Chatbots).",
    },
    {
      "key": "chatId",
      "label": "Chat ID",
      "type": "string",
      "required": true,
      "hint": "From List Chats.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "ID",
    },
    {
      "key": "created_at",
      "type": "string",
      "label": "Created (ISO 8601)",
    },
    {
      "key": "updated_at",
      "type": "string",
      "label": "Updated (ISO 8601)",
    },
    {
      "key": "conversation",
      "type": "array",
      "label": "Messages, each { role: user|assistant, message }",
    },
    {
      "key": "session_id",
      "type": "string",
      "label": "Session ID",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(
      `/chatbot/${encodeId(input.chatbotId)}/chats/${encodeId(input.chatId)}`,
    );
  },
};

export default chatbotChatGet;

import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Block Chat — Block a chat so its user can no longer interact. Needs an API key with the CHATBOTS_WRITE scope.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  chatbotId: string;
  chatId: string;
}

const chatbotChatBlock: ActionDefinition<Input> = {
  key: "chatbot-chat-block",
  type: "perform",
  resource: "chat",
  title: "Block Chat",
  description:
    "Block a chat so its user can no longer interact. Needs an API key with the CHATBOTS_WRITE scope.",
  idempotent: true,
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
      "key": "items",
      "type": "array",
      "label": "Blocked targets, each { target, targetType, status }",
    },
    {
      "key": "failed",
      "type": "array",
      "label": "Targets that could not be blocked",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(
      `/chatbot/${encodeId(input.chatbotId)}/chats/${encodeId(input.chatId)}/block`,
      { method: "PUT" },
    );
  },
};

export default chatbotChatBlock;

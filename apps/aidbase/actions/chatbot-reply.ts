import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Get Chatbot Reply — Send a message to a chatbot and get its AI reply. Pass the `session_id` from a previous reply to continue that conversation.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  chatbotId: string;
  message: string;
  sessionId?: string;
}

const chatbotReply: ActionDefinition<Input> = {
  key: "chatbot-reply",
  type: "perform",
  resource: "chat",
  title: "Get Chatbot Reply",
  description:
    "Send a message to a chatbot and get its AI reply. Pass the `session_id` from a previous reply to continue that conversation.",
  idempotent: false,
  params: [
    {
      "key": "chatbotId",
      "label": "Chatbot ID",
      "type": "string",
      "required": true,
      "hint": "The chatbot's public ID (`public_id` from List Chatbots).",
    },
    {
      "key": "message",
      "label": "Message",
      "type": "text",
      "required": true,
    },
    {
      "key": "sessionId",
      "label": "Session ID",
      "type": "string",
      "hint": "`session_id` of an earlier reply, to continue the conversation.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Message ID",
    },
    {
      "key": "session_id",
      "type": "string",
      "label": "Session ID to reuse for the next message",
    },
    {
      "key": "message",
      "type": "string",
      "label": "The chatbot's reply",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/chatbot/${encodeId(input.chatbotId)}/reply`, {
      method: "POST",
      body: compact({ message: input.message, session_id: input.sessionId }),
    });
  },
};

export default chatbotReply;

import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Get Chatbot — Fetch one chatbot.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  chatbotId: string;
}

const chatbotGet: ActionDefinition<Input> = {
  key: "chatbot-get",
  type: "read",
  resource: "chatbot",
  title: "Get Chatbot",
  description: "Fetch one chatbot.",
  params: [
    {
      "key": "chatbotId",
      "label": "Chatbot ID",
      "type": "string",
      "required": true,
      "hint":
        "The chatbot's public ID (`public_id` from List Chatbots), as used in Aidbase's examples.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Chatbot ID",
    },
    {
      "key": "public_id",
      "type": "string",
      "label": "Public ID",
    },
    {
      "key": "title",
      "type": "string",
      "label": "Title",
    },
    {
      "key": "allowed_domains",
      "type": "array",
      "label": "Domains the chatbot may run on",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/chatbot/${encodeId(input.chatbotId)}`);
  },
};

export default chatbotGet;

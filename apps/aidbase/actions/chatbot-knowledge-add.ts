import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Add Knowledge to Chatbot — Attach a trained knowledge item to a chatbot.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  chatbotId: string;
  knowledgeId: string;
}

const chatbotKnowledgeAdd: ActionDefinition<Input> = {
  key: "chatbot-knowledge-add",
  type: "perform",
  resource: "knowledge",
  title: "Add Knowledge to Chatbot",
  description: "Attach a trained knowledge item to a chatbot.",
  idempotent: true,
  params: [
    {
      "key": "chatbotId",
      "label": "Chatbot ID",
      "type": "string",
      "required": true,
      "hint":
        "The chatbot's public ID (`public_id` from List Chatbots), as used in Aidbase's examples.",
    },
    {
      "key": "knowledgeId",
      "label": "Knowledge ID",
      "type": "string",
      "required": true,
      "hint": "A trained knowledge item (see Train Knowledge).",
    },
  ],
  output: [
    {
      "key": "ok",
      "type": "boolean",
      "label": "True when Aidbase answered success",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).done(`/chatbot/${encodeId(input.chatbotId)}/knowledge`, {
      method: "PUT",
      body: compact({ knowledge_id: input.knowledgeId }),
    });
  },
};

export default chatbotKnowledgeAdd;

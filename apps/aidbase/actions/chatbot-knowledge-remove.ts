import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId } from "../lib/client.ts";

/**
 * Remove Knowledge from Chatbot — Detach a knowledge item from a chatbot. The knowledge item itself is not deleted.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  chatbotId: string;
  knowledgeId: string;
}

const chatbotKnowledgeRemove: ActionDefinition<Input> = {
  key: "chatbot-knowledge-remove",
  type: "perform",
  resource: "knowledge",
  title: "Remove Knowledge from Chatbot",
  description: "Detach a knowledge item from a chatbot. The knowledge item itself is not deleted.",
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
      method: "DELETE",
      body: compact({ knowledge_id: input.knowledgeId }),
    });
  },
};

export default chatbotKnowledgeRemove;

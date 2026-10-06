import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Delete Knowledge — Delete a knowledge item. Chatbots, inboxes and forms that used it lose it.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  knowledgeId: string;
}

const knowledgeDelete: ActionDefinition<Input> = {
  key: "knowledge-delete",
  type: "perform",
  resource: "knowledge",
  title: "Delete Knowledge",
  description: "Delete a knowledge item. Chatbots, inboxes and forms that used it lose it.",
  idempotent: true,
  params: [
    {
      "key": "knowledgeId",
      "label": "Knowledge ID",
      "type": "string",
      "required": true,
      "hint": "ID of the knowledge item (from List Knowledge).",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Knowledge item ID",
    },
    {
      "key": "type",
      "type": "string",
      "label": "website, video, document or faq",
    },
    {
      "key": "base_url",
      "type": "string",
      "label": "Website base URL (website items)",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/knowledge/${encodeId(input.knowledgeId)}`, {
      method: "DELETE",
    });
  },
};

export default knowledgeDelete;

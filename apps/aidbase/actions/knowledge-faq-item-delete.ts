import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Delete FAQ Item — Delete one question/answer item from an FAQ knowledge item.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  knowledgeId: string;
  faqItemId: string;
}

const knowledgeFaqItemDelete: ActionDefinition<Input> = {
  key: "knowledge-faq-item-delete",
  type: "perform",
  resource: "faq-item",
  title: "Delete FAQ Item",
  description: "Delete one question/answer item from an FAQ knowledge item.",
  idempotent: true,
  params: [
    {
      "key": "knowledgeId",
      "label": "FAQ Knowledge ID",
      "type": "string",
      "required": true,
    },
    {
      "key": "faqItemId",
      "label": "FAQ Item ID",
      "type": "string",
      "required": true,
      "hint": "From List FAQ Items.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "FAQ item ID",
    },
    {
      "key": "question",
      "type": "string",
      "label": "Question",
    },
    {
      "key": "answer",
      "type": "object",
      "label": "Answer",
    },
    {
      "key": "rating",
      "type": "object",
      "label": "{ upvotes, downvotes }",
    },
    {
      "key": "categories",
      "type": "array",
      "label": "Category names",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(
      `/knowledge/${encodeId(input.knowledgeId)}/faq-item/${encodeId(input.faqItemId)}`,
      { method: "DELETE" },
    );
  },
};

export default knowledgeFaqItemDelete;

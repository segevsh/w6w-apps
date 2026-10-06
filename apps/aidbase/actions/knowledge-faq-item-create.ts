import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact, encodeId, toList } from "../lib/client.ts";

/**
 * Create FAQ Item — Add a question and answer to an FAQ knowledge item. Categories that do not exist are created. Run Train Knowledge to index the change.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  knowledgeId: string;
  question: string;
  answer: string;
  sourceUrl?: string;
  categories?: string;
}

const knowledgeFaqItemCreate: ActionDefinition<Input> = {
  key: "knowledge-faq-item-create",
  type: "perform",
  resource: "faq-item",
  title: "Create FAQ Item",
  description:
    "Add a question and answer to an FAQ knowledge item. Categories that do not exist are created. Run Train Knowledge to index the change.",
  idempotent: false,
  params: [
    {
      "key": "knowledgeId",
      "label": "FAQ Knowledge ID",
      "type": "string",
      "required": true,
      "hint": "ID of an FAQ knowledge item.",
    },
    {
      "key": "question",
      "label": "Question",
      "type": "string",
      "required": true,
    },
    {
      "key": "answer",
      "label": "Answer",
      "type": "text",
      "required": true,
    },
    {
      "key": "sourceUrl",
      "label": "Source URL",
      "type": "string",
    },
    {
      "key": "categories",
      "label": "Categories",
      "type": "string",
      "hint": "Comma-separated category names, or a list.",
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
      "type": "array",
      "label": "Answer blocks",
    },
    {
      "key": "source_url",
      "type": "string",
      "label": "Source URL",
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
    return new AidbaseClient(ctx).object(`/knowledge/${encodeId(input.knowledgeId)}/faq-item`, {
      method: "POST",
      body: compact({
        question: input.question,
        answer: input.answer,
        source_url: input.sourceUrl,
        categories: toList(input.categories),
      }),
    });
  },
};

export default knowledgeFaqItemCreate;

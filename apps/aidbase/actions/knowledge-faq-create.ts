import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact } from "../lib/client.ts";

/**
 * Create FAQ — Create an FAQ knowledge item to hold question/answer items.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  title: string;
  description?: string;
}

const knowledgeFaqCreate: ActionDefinition<Input> = {
  key: "knowledge-faq-create",
  type: "perform",
  resource: "knowledge",
  title: "Create FAQ",
  description: "Create an FAQ knowledge item to hold question/answer items.",
  idempotent: false,
  params: [
    {
      "key": "title",
      "label": "Title",
      "type": "string",
      "required": true,
    },
    {
      "key": "description",
      "label": "Description",
      "type": "text",
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
      "label": "faq",
    },
    {
      "key": "title",
      "type": "string",
      "label": "Title",
    },
    {
      "key": "description",
      "type": "string",
      "label": "Description",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/knowledge/faq`, {
      method: "POST",
      body: compact({ title: input.title, description: input.description }),
    });
  },
};

export default knowledgeFaqCreate;

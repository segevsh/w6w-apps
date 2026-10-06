import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Get Knowledge — Fetch one knowledge item, including its training status.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  knowledgeId: string;
}

const knowledgeGet: ActionDefinition<Input> = {
  key: "knowledge-get",
  type: "read",
  resource: "knowledge",
  title: "Get Knowledge",
  description: "Fetch one knowledge item, including its training status.",
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
    {
      "key": "trained_at",
      "type": "string",
      "label": "Last successful training, null if never",
    },
    {
      "key": "is_training",
      "type": "boolean",
      "label": "True while a training run is in progress",
    },
    {
      "key": "training_failed_at",
      "type": "string",
      "label": "When the last training failed",
    },
    {
      "key": "training_failed_with",
      "type": "string",
      "label": "Why the last training failed",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/knowledge/${encodeId(input.knowledgeId)}`);
  },
};

export default knowledgeGet;

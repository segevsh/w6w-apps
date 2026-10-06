import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Train Knowledge — Start a training run for a knowledge item. It finishes later: poll Get Knowledge and watch `is_training` and `trained_at`.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  knowledgeId: string;
}

const knowledgeTrain: ActionDefinition<Input> = {
  key: "knowledge-train",
  type: "perform",
  resource: "knowledge",
  title: "Train Knowledge",
  description:
    "Start a training run for a knowledge item. It finishes later: poll Get Knowledge and watch `is_training` and `trained_at`.",
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
    {
      "key": "title",
      "type": "string",
      "label": "Title (faq items)",
    },
    {
      "key": "description",
      "type": "string",
      "label": "Description (faq items)",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/knowledge/${encodeId(input.knowledgeId)}/train`, {
      method: "PUT",
    });
  },
};

export default knowledgeTrain;

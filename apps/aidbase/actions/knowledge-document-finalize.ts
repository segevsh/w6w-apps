import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, encodeId } from "../lib/client.ts";

/**
 * Finalize Document — Complete a document knowledge item after its file has been uploaded to the `upload_url`.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  knowledgeId: string;
}

const knowledgeDocumentFinalize: ActionDefinition<Input> = {
  key: "knowledge-document-finalize",
  type: "perform",
  resource: "knowledge",
  title: "Finalize Document",
  description:
    "Complete a document knowledge item after its file has been uploaded to the `upload_url`.",
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
      "label": "document",
    },
    {
      "key": "document_url",
      "type": "string",
      "label": "Stored document URL",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/knowledge/${encodeId(input.knowledgeId)}/finalize`, {
      method: "POST",
    });
  },
};

export default knowledgeDocumentFinalize;

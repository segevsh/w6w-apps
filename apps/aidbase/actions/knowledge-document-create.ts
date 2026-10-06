import type { ActionDefinition } from "@w6w/types";
import { AidbaseClient, compact } from "../lib/client.ts";

/**
 * Create Document Upload — Start a document knowledge item. Returns a signed `upload_url`: upload the file there, then run Finalize Document.
 *
 * Verified against the Aidbase API reference (docs.aidbase.ai, fetched 2026-10-06).
 */
interface Input {
  fileType: string;
  fileName?: string;
}

const knowledgeDocumentCreate: ActionDefinition<Input> = {
  key: "knowledge-document-create",
  type: "perform",
  resource: "knowledge",
  title: "Create Document Upload",
  description:
    "Start a document knowledge item. Returns a signed `upload_url`: upload the file there, then run Finalize Document.",
  idempotent: false,
  params: [
    {
      "key": "fileType",
      "label": "File type",
      "type": "select",
      "required": true,
      "hint": "MIME type of the file to upload.",
      "options": [
        {
          "value": "application/pdf",
          "label": "application/pdf",
        },
        {
          "value": "application/msword",
          "label": "application/msword",
        },
        {
          "value": "text/plain",
          "label": "text/plain",
        },
        {
          "value": "text/csv",
          "label": "text/csv",
        },
      ],
    },
    {
      "key": "fileName",
      "label": "File name",
      "type": "string",
      "hint": "Optional name for the document.",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Knowledge item ID",
    },
    {
      "key": "upload_url",
      "type": "string",
      "label": "Signed URL to upload the file to",
    },
  ],

  execute(input, ctx) {
    return new AidbaseClient(ctx).object(`/knowledge/document`, {
      method: "POST",
      body: compact({ file_type: input.fileType, file_name: input.fileName }),
    });
  },
};

export default knowledgeDocumentCreate;

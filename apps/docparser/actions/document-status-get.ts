import type { ActionDefinition } from "@w6w/types";
import { DocparserClient, encodeId } from "../lib/client.ts";

interface Input {
  parserId: string;
  documentId: string;
}

const documentStatusGet: ActionDefinition<Input> = {
  key: "document-status-get",
  type: "read",
  resource: "document",
  title: "Get Document Status",
  description: "Where a document is in the import and processing pipeline: in-progress flags, " +
    "timestamps, page count and any failed jobs.",
  params: [
    { key: "parserId", label: "Parser ID", type: "string", required: true },
    { key: "documentId", label: "Document ID", type: "string", required: true },
  ],
  output: [
    { key: "filename", type: "string", label: "File name" },
    { key: "pages", type: "number", label: "Pages" },
    { key: "supported", type: "boolean", label: "Supported" },
    { key: "importing_in_progress", type: "boolean", label: "Importing" },
    { key: "processing_in_progress", type: "boolean", label: "Processing" },
    { key: "processed_at", type: "number", label: "Processed at (unix, 0 = not yet)" },
    { key: "failed_jobs", type: "array", label: "Failed jobs" },
  ],

  execute(input, ctx) {
    const p = encodeId(input.parserId, "parserId");
    const d = encodeId(input.documentId, "documentId");
    return new DocparserClient(ctx).json(`/v2/document/status/${p}/${d}`);
  },
};

export default documentStatusGet;

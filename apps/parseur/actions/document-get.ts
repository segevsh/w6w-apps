import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

/**
 * `GET /document/{id}` — a single document's full record, including its
 * parsed `result` and download URLs.
 */
interface Input {
  documentId: string;
}

const documentGet: ActionDefinition<Input> = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Fetch a single document by id, including its parsed result.",
  params: [documentIdParam],
  output: [
    { key: "id", type: "number", label: "Document ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "status", type: "string", label: "Status" },
    { key: "result", type: "string", label: "Parsed result (JSON string)" },
    { key: "json_download_url", type: "string", label: "JSON download URL" },
  ],

  execute(input, ctx) {
    return new ParseurClient(ctx).request(`/document/${encodeId(input.documentId)}`);
  },
};

export default documentGet;

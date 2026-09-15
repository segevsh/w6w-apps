import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient } from "../lib/client.ts";
import { documentIdParam, documentSummaryOutput } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `GET /v1/document/properties` — a document's full status: sender, signers
 * and their per-signer status, form fields, reminder settings and history.
 *
 * The real response is large and deeply nested (form groups, reassignment
 * records, the full audit trail), so `output` only names the summary fields a
 * workflow typically reads — the full object is still returned at runtime.
 */
const documentProperties: ActionDefinition<Input> = {
  key: "document-properties",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Retrieve a document's status, signers and history.",
  params: [documentIdParam],
  output: documentSummaryOutput,

  execute(input, ctx) {
    return new BoldSignClient(ctx).request("/document/properties", {
      query: { documentId: input.documentId },
    });
  },
};

export default documentProperties;

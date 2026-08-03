import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `GET /public/v1/documents/{id}/details` — the full document.
 *
 * Distinct route from the status read (`GET /public/v1/documents/{id}`), and a
 * much heavier one: recipients and their completion state, every field with its
 * value, tokens, pricing tables and quotes with line items and totals, tables,
 * images, text blocks, metadata, tags, linked CRM objects, the editing lock if
 * one is held, and the grand total. This is what you read *after* a document
 * completes to get the answers out of it.
 */
const documentGet: ActionDefinition<Input> = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get Document Details",
  description:
    "Read a document in full — recipients, fields and their values, tokens, pricing, metadata and totals.",
  params: [documentIdParam],
  output: [
    { key: "id", type: "string", label: "Document ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "recipients", type: "array", label: "Recipients" },
    { key: "fields", type: "array", label: "Fields and their values" },
    { key: "tokens", type: "array", label: "Tokens" },
    { key: "metadata", type: "object", label: "Metadata" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "pricing", type: "object", label: "Pricing tables and quotes" },
    { key: "grand_total", type: "object", label: "Grand total (amount + currency)" },
  ],

  async execute(input, ctx) {
    return await new PandaDocClient(ctx).request(
      `/documents/${encodeURIComponent(input.documentId)}/details`,
    );
  },
};

export default documentGet;

import type { ActionDefinition } from "@w6w/types";
import { csv, MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `GET /indexes/{indexUid}/documents/{documentId}` — verified against
 * Meilisearch's OpenAPI document (`get_document`).
 *
 * The id here is the value of the index's **primary key**, whatever that
 * attribute happens to be named — not a Meilisearch-assigned identifier. There
 * is no internal id to fall back on.
 */
const action: ActionDefinition = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get a document",
  description: "Retrieve one document by its primary key value.",
  params: [
    INDEX_PARAM,
    {
      key: "documentId",
      label: "Document ID",
      type: "string",
      required: true,
      default: "",
      hint: "The value of the index's primary key for this document.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      hint: "Comma-separated. Blank returns the whole document.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);
    const id = String(p.documentId ?? "").trim();
    if (!id) throw new Error("`documentId` is required");

    ctx.log("info", "getting a Meilisearch document", { index });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/documents/${encodeURIComponent(id)}`,
      { query: { fields: csv(p.fields)?.join(",") } },
    );
  },
};

export default action;

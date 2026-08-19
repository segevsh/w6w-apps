import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * `GET /collections/{name}/documents/{id}` — one document, by id.
 *
 * ## This is the only exact read Typesense offers
 *
 * Everything else here is a search, with ranking, typo tolerance and the
 * widening behaviour that comes with them. This is a key lookup: the document
 * with that id, or a 404.
 *
 * That makes it the right call when a workflow already knows the id — checking
 * whether a record was indexed, reading back what was written — and the wrong
 * one for anything resembling a question about the data.
 *
 * ## The id is a string, always
 *
 * Typesense's `id` field is a string even when it looks like a number.
 * Fetching `1234` and fetching `"1234"` are the same call; storing an integer
 * id in a document is not, and Typesense will reject it.
 */
const action: ActionDefinition = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get a document",
  description:
    "Fetch one document by id — the only EXACT read Typesense offers, with no ranking, no typo " +
    "tolerance and none of the widening a search does. The right call when the id is already " +
    "known.",
  params: [
    { key: "collection", label: "Collection", type: "string", required: true, default: "" },
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      default: "",
      hint: "Always a string in Typesense, even when it looks like a number.",
    },
  ],
  output: [
    { key: "document", type: "object", label: "The document" },
    { key: "id", type: "string", label: "Its id" },
    { key: "found", type: "boolean", label: "Whether it exists" },
    { key: "fields", type: "array", label: "The field names it carries" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");

    const document = await new TypesenseClient(ctx).request<Record<string, unknown>>(
      `/collections/${encodeURIComponent(collection)}/documents/${encodeURIComponent(id)}`,
    );

    return {
      document,
      id: String(document?.id ?? id),
      found: Boolean(document),
      // Names only — the values are the customer's data.
      fields: Object.keys(document ?? {}),
    };
  },
};

export default action;

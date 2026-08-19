import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * Delete one document, or every document matching a filter.
 *
 * `DELETE /collections/{name}/documents/{id}`, or
 * `DELETE /collections/{name}/documents?filter_by=…`.
 *
 * ## Delete-by-filter is the dangerous one, and it is one character away
 *
 * `filter_by: "in_stock:false"` removes every out-of-stock product. A filter
 * that matches everything removes the collection's contents while leaving the
 * collection in place — and Typesense reports it as a success with a count.
 *
 * There is no dry run in the API, so this action does one: it **searches with
 * the same filter first**, reports how many documents match, and refuses to
 * proceed past a threshold unless told to. Finding out that a filter matched
 * forty thousand documents is worth one extra request.
 *
 * ## Deleting is not the same as re-indexing
 *
 * A search index reflects a source somewhere else. Deleting from the index
 * without deleting from the source means the next full re-index brings the
 * documents back — which is either a bug or exactly what you wanted, depending
 * on why they were deleted.
 */
const action: ActionDefinition = {
  key: "document-delete",
  type: "perform",
  resource: "document",
  title: "Delete documents",
  description:
    "Delete one document by id, or every document matching a FILTER. Typesense offers no dry " +
    "run, so this one searches with the same filter first and refuses past a threshold — a " +
    "filter that matches everything empties the collection and reports success.",
  idempotent: true,
  params: [
    { key: "collection", label: "Collection", type: "string", required: true, default: "" },
    {
      key: "id",
      label: "Document ID",
      type: "string",
      default: "",
      hint: "Delete exactly this one. Give either an id or a filter, never both.",
    },
    {
      key: "filterBy",
      label: "Filter by",
      type: "string",
      default: "",
      placeholder: "in_stock:false && updated_at:<1690000000",
      hint: "Deletes everything matching. Counted first, and refused past the limit below.",
    },
    {
      key: "maxDocuments",
      label: "Refuse past this many",
      type: "number",
      default: 1000,
      hint: "The count comes from a search with the same filter. Raise it deliberately.",
    },
  ],
  output: [
    { key: "collection", type: "string", label: "Which collection" },
    { key: "deleted", type: "number", label: "How many documents went" },
    { key: "matched", type: "number", label: "How many the filter matched beforehand" },
    { key: "mode", type: "string", label: "id or filter" },
    { key: "filterBy", type: "string", label: "The filter, for the record" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");
    const id = String(p.id ?? "").trim();
    const filterBy = String(p.filterBy ?? "").trim();

    if (!id && !filterBy) throw new Error("give either an `id` or a `filterBy`");
    if (id && filterBy) {
      throw new Error(
        "give an `id` or a `filterBy`, not both — they are different endpoints, and sending " +
          "both would silently use one",
      );
    }

    const client = new TypesenseClient(ctx);

    if (id) {
      await client.request(
        `/collections/${encodeURIComponent(collection)}/documents/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      return { collection, deleted: 1, matched: 1, mode: "id", filterBy: undefined };
    }

    // The dry run the API does not offer.
    const preview = await client.request<{ found?: number }>(
      `/collections/${encodeURIComponent(collection)}/documents/search`,
      { query: { q: "*", filter_by: filterBy, per_page: 0 } },
    );
    const matched = Number(preview?.found ?? 0);
    const limit = Math.max(0, Number(p.maxDocuments ?? 1000));

    if (matched > limit) {
      throw new Error(
        `this filter matches ${matched} documents, above the limit of ${limit}. Typesense will ` +
          "delete every one of them and report it as a success — raise `maxDocuments` " +
          "deliberately if that is intended",
      );
    }
    if (matched === 0) {
      return { collection, deleted: 0, matched: 0, mode: "filter", filterBy };
    }

    const result = await client.request<{ num_deleted?: number }>(
      `/collections/${encodeURIComponent(collection)}/documents`,
      { method: "DELETE", query: { filter_by: filterBy } },
    );

    // A count, and the filter. Never the documents.
    ctx.log(
      "warn",
      "deleted documents from a Typesense collection by filter — a search index " +
        "reflects a source elsewhere, so a full re-index will bring them back unless the source " +
        "changed too",
      { collection, deleted: result?.num_deleted ?? matched },
    );

    return {
      collection,
      deleted: Number(result?.num_deleted ?? matched),
      matched,
      mode: "filter",
      filterBy,
    };
  },
};

export default action;

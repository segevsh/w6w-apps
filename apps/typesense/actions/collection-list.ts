import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * `GET /collections` — what this node holds.
 *
 * ## `num_documents` is the number that matters, and it is a snapshot
 *
 * Typesense holds its index **in memory**. The document count is therefore
 * also, roughly, the shape of the RAM bill: a collection that has quietly
 * grown is a node that will eventually stop accepting writes with
 * `OUT_OF_MEMORY`, which the `capacity` health check watches for.
 *
 * ## An empty collection and a missing one look very different from a search
 *
 * A search against a collection with no documents returns `found: 0` with a
 * 200. A search against a collection that does not exist returns 404. Both are
 * "no results" to a workflow that only reads the count — which is why the
 * reindex pattern uses an alias, so the name always resolves.
 */
const action: ActionDefinition = {
  key: "collection-list",
  type: "search",
  resource: "collection",
  title: "List collections",
  description:
    "The collections on this node, with their document counts and field shapes. Typesense holds " +
    "its index IN MEMORY, so a document count is also roughly the RAM bill — the thing that " +
    "eventually returns OUT_OF_MEMORY.",
  params: [
    {
      key: "nameContains",
      label: "Name contains",
      type: "string",
      default: "",
      hint: "Matched here, case-insensitively. Collection names themselves are case-sensitive.",
    },
  ],
  output: [
    { key: "collections", type: "array", label: "The collections" },
    { key: "count", type: "number", label: "How many" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "totalDocuments", type: "number", label: "Documents across all of them" },
    { key: "largest", type: "object", label: "The collection holding the most" },
    { key: "empty", type: "array", label: "Collections with no documents" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const all = await new TypesenseClient(ctx).request<
      Array<{
        name?: string;
        num_documents?: number;
        created_at?: number;
        fields?: Array<{ name?: string; type?: string; facet?: boolean }>;
        default_sorting_field?: string;
      }>
    >("/collections");

    const list = Array.isArray(all) ? all : [];
    const needle = String(p.nameContains ?? "").trim().toLowerCase();
    const collections = needle
      ? list.filter((collection) => String(collection?.name ?? "").toLowerCase().includes(needle))
      : list;

    const sorted = [...collections].sort((a, b) =>
      Number(b?.num_documents ?? 0) - Number(a?.num_documents ?? 0)
    );

    return {
      collections: collections.map((collection) => ({
        name: collection?.name,
        numDocuments: collection?.num_documents,
        fieldCount: (collection?.fields ?? []).length,
        facetFields: (collection?.fields ?? [])
          .filter((field) => field?.facet === true)
          .map((field) => field?.name),
        defaultSortingField: collection?.default_sorting_field,
        createdAt: collection?.created_at,
      })),
      count: collections.length,
      names: collections.map((collection) => collection?.name).filter(Boolean),
      totalDocuments: collections.reduce(
        (sum, collection) => sum + Number(collection?.num_documents ?? 0),
        0,
      ),
      largest: sorted[0]
        ? { name: sorted[0]?.name, numDocuments: sorted[0]?.num_documents }
        : undefined,
      // Empty and missing are different failures that look the same downstream.
      empty: collections
        .filter((collection) => Number(collection?.num_documents ?? 0) === 0)
        .map((collection) => collection?.name)
        .filter(Boolean),
    };
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { TypesenseClient } from "../lib/client.ts";

/**
 * `GET /collections/{name}` — one collection's schema.
 *
 * ## The schema is what every search and every write has to satisfy
 *
 * Three properties of a field decide what can be done with it, and none of
 * them is guessable from the data:
 *
 * - **Type.** `string`, `int32`, `float`, `bool`, `string[]`, `geopoint`, and
 *   the rest. A document whose field does not match is rejected with a 422.
 * - **`facet`.** Only faceted fields can appear in `facet_by`, and turning it
 *   on later means re-indexing.
 * - **`index`.** A field with `index: false` is stored and not searchable,
 *   which is exactly what a search returning nothing looks like.
 *
 * `document-search` needs the string fields; this is where they come from.
 *
 * ## `.*` is a catch-all, and its absence is why writes fail
 *
 * A schema with a `.*` field accepts unknown fields. Without one Typesense
 * rejects any document carrying a field the schema does not name — which is
 * the commonest reason an import that worked yesterday fails today, after
 * somebody added a column upstream.
 *
 * ## `default_sorting_field` must be numeric, and decides ties
 *
 * When two documents match equally well, this breaks the tie. A collection
 * without one leaves equal matches in an unspecified order, so a workflow
 * taking `hits[0]` gets a different document run to run.
 */
const action: ActionDefinition = {
  key: "collection-get",
  type: "read",
  resource: "collection",
  title: "Get a collection's schema",
  description:
    "The schema every search and write has to satisfy. Reports which fields are SEARCHABLE, " +
    "which are facetable, whether the schema has a `.*` catch-all — its absence is why an " +
    "import breaks when somebody adds a column upstream — and whether ties have a tiebreaker.",
  params: [
    {
      key: "collection",
      label: "Collection",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "collection", type: "object", label: "The schema" },
    { key: "name", type: "string", label: "Its name" },
    { key: "numDocuments", type: "number", label: "How many documents" },
    { key: "fields", type: "array", label: "Every field, with what may be done to it" },
    { key: "searchableFields", type: "array", label: "String fields — what `query_by` takes" },
    { key: "facetFields", type: "array", label: "Fields `facet_by` accepts" },
    { key: "unindexedFields", type: "array", label: "Stored and not searchable" },
    { key: "acceptsUnknownFields", type: "boolean", label: "Whether the schema has a `.*`" },
    { key: "defaultSortingField", type: "string", label: "What breaks a tie in ranking" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const schema = await new TypesenseClient(ctx).request<{
      name?: string;
      num_documents?: number;
      default_sorting_field?: string;
      fields?: Array<{
        name?: string;
        type?: string;
        facet?: boolean;
        index?: boolean;
        optional?: boolean;
        sort?: boolean;
      }>;
    }>(`/collections/${encodeURIComponent(collection)}`);

    const fields = schema?.fields ?? [];
    const acceptsUnknownFields = fields.some((field) => field?.name === ".*");

    if (!acceptsUnknownFields) {
      ctx.log(
        "info",
        "this schema has no `.*` catch-all, so a document carrying any field it does not name " +
          "is rejected — which is what happens the first time somebody adds a column upstream",
        { collection },
      );
    }
    if (!schema?.default_sorting_field) {
      ctx.log(
        "info",
        "this collection has no default sorting field, so documents that match equally well come " +
          "back in an unspecified order — a workflow taking the first hit may get a different " +
          "document each run",
        { collection },
      );
    }

    return {
      collection: schema,
      name: schema?.name,
      numDocuments: schema?.num_documents,
      fields: fields.map((field) => ({
        name: field?.name,
        type: field?.type,
        facet: field?.facet === true,
        indexed: field?.index !== false,
        optional: field?.optional === true,
        sortable: field?.sort === true,
      })),
      // What `query_by` will accept — naming anything else is an error.
      searchableFields: fields
        .filter((field) => field?.index !== false && String(field?.type ?? "").startsWith("string"))
        .map((field) => field?.name)
        .filter(Boolean),
      facetFields: fields.filter((field) => field?.facet === true).map((field) => field?.name),
      unindexedFields: fields.filter((field) => field?.index === false).map((field) => field?.name),
      acceptsUnknownFields,
      defaultSortingField: schema?.default_sorting_field,
    };
  },
};

export default action;

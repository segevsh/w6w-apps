import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM, WAIT_PARAM } from "../lib/params.ts";

/**
 * `PUT /collections/{name}/index` — index a payload field so filters on it are
 * fast.
 *
 * ## Filtering works without this, and slowly
 *
 * That is what makes it easy to miss. An unindexed filter is not rejected —
 * Qdrant scans, and on a small collection nobody notices. The same filter on a
 * million points is the difference between milliseconds and seconds, and it
 * degrades gradually as the collection grows rather than failing at a point
 * anyone can name.
 *
 * The rule of thumb: **every field a workflow filters on should be indexed**,
 * and the tenant field most of all.
 *
 * ## The schema type must match the data
 *
 * `keyword` for exact string matches — ids, tenants, statuses. `text` for
 * full-text search within a field, which is a different index. `integer`,
 * `float`, `bool`, `datetime` for their types, and `geo` for coordinates.
 *
 * Indexing a numeric field as `keyword` produces an index that cannot answer a
 * range query, and Qdrant will fall back to scanning without saying so.
 */
const action: ActionDefinition = {
  key: "index-create",
  type: "perform",
  resource: "collection",
  title: "Index a payload field",
  description:
    "Make filters on a field fast. Filtering works WITHOUT this — by scanning — so the cost " +
    "appears gradually as the collection grows rather than as a failure.",
  idempotent: true,
  params: [
    COLLECTION_PARAM,
    {
      key: "field",
      label: "Field",
      type: "string",
      required: true,
      default: "",
      hint: "The payload key. Every field a workflow filters on should be indexed, and the " +
        "tenant field most of all.",
    },
    {
      key: "schema",
      label: "Type",
      type: "select",
      required: true,
      default: "keyword",
      options: [
        { value: "keyword", label: "keyword — exact string match" },
        { value: "text", label: "text — full-text search within the field" },
        { value: "integer", label: "integer" },
        { value: "float", label: "float" },
        { value: "bool", label: "bool" },
        { value: "datetime", label: "datetime" },
        { value: "geo", label: "geo — coordinates" },
        { value: "uuid", label: "uuid" },
      ],
      hint: "Must match the data. A number indexed as `keyword` cannot answer a range query, and " +
        "Qdrant falls back to scanning without saying so.",
    },
    WAIT_PARAM,
  ],
  output: [
    { key: "operation_id", type: "number", label: "Qdrant's operation id" },
    { key: "status", type: "string", label: "acknowledged or completed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    const field = String(p.field ?? "").trim();
    if (!collection) throw new Error("`collection` is required");
    if (!field) throw new Error("`field` is required");

    const result = await new QdrantClient(ctx).request<{ status?: string }>(
      `/collections/${encodeURIComponent(collection)}/index`,
      {
        method: "PUT",
        body: {
          field_name: field,
          field_schema: p.schema === undefined ? "keyword" : String(p.schema),
        },
        query: { wait: p.wait === undefined ? true : p.wait === true },
      },
    );

    ctx.log("info", "indexed a Qdrant payload field", { collection, field });
    return result;
  },
};

export default action;

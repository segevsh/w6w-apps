import type { ActionDefinition } from "@w6w/types";
import { json, TypesenseClient } from "../lib/client.ts";

/**
 * `POST /collections` — define a collection.
 *
 * ## There is no create-or-update, and that shapes everything
 *
 * A collection whose name exists returns **409**. Typesense's schema is only
 * partly alterable — fields can be added and dropped through a PATCH, but the
 * type of an existing field cannot change — so the accepted way to reshape a
 * collection is to build a new one and swap an **alias** over to it.
 *
 * That is the whole reindex pattern, and it is why this app has
 * `alias-upsert`: create `products_v2`, import into it, point the `products`
 * alias at it, delete `products_v1`. No search sees a gap.
 *
 * ## `auto` schema detection is a convenience with a long tail
 *
 * A field named `.*` with type `auto` lets Typesense infer types from the
 * first document it sees. Convenient, and it means the type of a field is
 * decided by whichever record happened to arrive first — a postcode that
 * starts numeric becomes an `int32`, and every later alphanumeric one is
 * rejected.
 *
 * ## `default_sorting_field` must be numeric
 *
 * It breaks ties between equally-matching documents. Naming a string field is
 * rejected, and omitting it leaves equal matches in an unspecified order.
 */
const action: ActionDefinition = {
  key: "collection-create",
  type: "perform",
  resource: "collection",
  title: "Create a collection",
  description:
    "Define a collection. Typesense has NO create-or-update — an existing name is a 409 — and " +
    "an existing field's type cannot be changed, so reshaping means building a new collection " +
    "and swapping an ALIAS over to it.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "Case-sensitive. For the reindex pattern, use a versioned name and point an alias at " +
        "it.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"name":"title","type":"string"},{"name":"price","type":"float"}]',
      hint: "Each needs `name` and `type`. Add `facet: true` to a field you want to facet on — " +
        "turning it on later means re-indexing. A `.*` field with type `auto` accepts anything.",
    },
    {
      key: "defaultSortingField",
      label: "Default sorting field",
      type: "string",
      default: "",
      hint: "Must be a NUMERIC field. It breaks ties between equally-matching documents; without " +
        "one their order is unspecified.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "The collection" },
    { key: "fieldCount", type: "number", label: "How many fields were declared" },
    { key: "searchableFields", type: "array", label: "String fields `query_by` will accept" },
    { key: "acceptsUnknownFields", type: "boolean", label: "Whether it has a `.*` catch-all" },
    { key: "usesAutoTypes", type: "boolean", label: "Types inferred from the first document" },
    { key: "createdAt", type: "number", label: "When Typesense made it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const fields = json(p.fields, "fields");
    if (!Array.isArray(fields) || !fields.length) {
      throw new Error("`fields` must be a non-empty array of field definitions");
    }
    const invalid = fields
      .map((field, index) => ({ field: field as Record<string, unknown>, index }))
      .filter(({ field }) => !field?.name || !field?.type);
    if (invalid.length) {
      throw new Error(
        `every field needs a \`name\` and a \`type\` — these do not: ${
          invalid.map(({ index }) => index).join(", ")
        }`,
      );
    }

    const typed = fields as Array<{ name?: string; type?: string }>;
    const usesAutoTypes = typed.some((field) => field?.type === "auto");
    if (usesAutoTypes) {
      ctx.log(
        "info",
        "this schema infers types from the first document it sees, so the type of a field is " +
          "decided by whichever record arrives first — a numeric-looking postcode becomes an " +
          "integer, and every later alphanumeric one is rejected",
        { collection: name },
      );
    }

    const created = await new TypesenseClient(ctx).request<{
      name?: string;
      created_at?: number;
    }>("/collections", {
      method: "POST",
      body: {
        name,
        fields,
        ...(String(p.defaultSortingField ?? "").trim()
          ? { default_sorting_field: String(p.defaultSortingField).trim() }
          : {}),
      },
    });

    return {
      name: created?.name ?? name,
      fieldCount: typed.length,
      searchableFields: typed
        .filter((field) => String(field?.type ?? "").startsWith("string"))
        .map((field) => field?.name)
        .filter(Boolean),
      acceptsUnknownFields: typed.some((field) => field?.name === ".*"),
      usesAutoTypes,
      createdAt: created?.created_at,
    };
  },
};

export default action;

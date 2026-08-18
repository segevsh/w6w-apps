import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, pointIds, QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM, WAIT_PARAM } from "../lib/params.ts";

/**
 * `POST /collections/{name}/points/payload/delete` — remove named fields from
 * points' payloads.
 *
 * The counterpart to `payload-set`, and worth having as its own action because
 * setting a field to `null` is not the same as removing it: a `null` value
 * still matches an `is_empty` filter differently from an absent key, and it
 * still occupies storage.
 *
 * The real use is retention. Removing a field from every point matching a
 * filter — a customer's name, a raw document body kept only for reprocessing —
 * is a data-minimisation step that leaves the vectors and the rest of the
 * payload intact.
 *
 * The same guard as elsewhere: an empty filter would apply to the whole
 * collection, so it is refused rather than run.
 */
const action: ActionDefinition = {
  key: "payload-delete",
  type: "perform",
  resource: "point",
  title: "Delete payload fields",
  description:
    "Remove named fields from payloads, leaving the vectors and the rest intact — the shape a " +
    "retention rule takes. Setting a field to null is not the same as removing it.",
  idempotent: true,
  params: [
    COLLECTION_PARAM,
    {
      key: "keys",
      label: "Fields",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated field names to remove.",
    },
    { key: "ids", label: "Point IDs", type: "string", default: "" },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      default: "",
      hint: "Applies to every matching point. An empty object matches everything and is refused.",
    },
    WAIT_PARAM,
  ],
  output: [
    { key: "operation_id", type: "number", label: "Qdrant's operation id" },
    { key: "status", type: "string", label: "acknowledged or completed" },
    { key: "removed", type: "array", label: "The fields removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const keys = csv(p.keys);
    if (!keys || keys.length === 0) throw new Error("`keys` is required");

    const rawIds = String(p.ids ?? "").trim();
    const filter = json(p.filter, "filter") as Record<string, unknown> | undefined;
    if (!rawIds && !filter) throw new Error("give `ids` or a `filter` to choose the points");
    if (filter && Object.keys(filter).length === 0) {
      throw new Error(
        "`filter` is empty, which would remove these fields from every point in the collection",
      );
    }

    const result = await new QdrantClient(ctx).request<{ status?: string }>(
      `/collections/${encodeURIComponent(collection)}/points/payload/delete`,
      {
        method: "POST",
        body: compact({
          keys,
          points: rawIds ? pointIds(rawIds, "ids") : undefined,
          filter,
        }),
        query: { wait: p.wait === undefined ? true : p.wait === true },
      },
    );

    ctx.log("info", "removed Qdrant payload fields", { collection, fields: keys });
    return { ...result, removed: keys };
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { compact, json, pointIds, QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM, WAIT_PARAM } from "../lib/params.ts";

/**
 * `POST /collections/{name}/points/payload` — change a point's metadata without
 * touching its vector.
 *
 * ## This is the merge that upsert is not
 *
 * `point-upsert` replaces a point entirely. This **merges**: the named keys are
 * set, everything else on the point is left alone, and the vector is untouched.
 * Marking a document as reviewed, adding a tag, updating a status — all of them
 * are this, and doing them with an upsert would require re-sending the vector
 * and would erase any field not included.
 *
 * ## The points can be chosen by filter
 *
 * Which makes bulk labelling one call: "set `archived: true` on everything from
 * before June". The same caution as `point-delete` applies in a milder form —
 * an empty filter matches everything — so it is refused rather than applied.
 *
 * ## A field is not filterable until it is indexed
 *
 * Writing a payload key does not make it efficiently searchable. `index-create`
 * is what makes a filter on that field fast, and without it Qdrant will still
 * answer — by scanning, which on a large collection is the difference between
 * milliseconds and seconds.
 */
const action: ActionDefinition = {
  key: "payload-set",
  type: "perform",
  resource: "point",
  title: "Set payload fields",
  description:
    "Merge fields into points' payloads without touching their vectors — what `point-upsert` " +
    "cannot do, since that replaces the point entirely.",
  idempotent: true,
  params: [
    COLLECTION_PARAM,
    {
      key: "payload",
      label: "Payload",
      type: "json",
      required: true,
      default: "",
      hint: 'The fields to set, e.g. {"reviewed": true}. Existing fields not named here are kept.',
    },
    {
      key: "ids",
      label: "Point IDs",
      type: "string",
      default: "",
      hint: "Comma-separated or a JSON array. Give these or a filter.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "json",
      default: "",
      hint: "Applies to every matching point — bulk labelling in one call. An empty object " +
        "matches everything and is refused.",
    },
    {
      key: "key",
      label: "Nest Under Key",
      type: "string",
      default: "",
      advanced: true,
      hint: "Writes the payload under this nested key rather than at the top level.",
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
    if (!collection) throw new Error("`collection` is required");

    const payload = json(p.payload, "payload") as Record<string, unknown> | undefined;
    if (!payload || Object.keys(payload).length === 0) {
      throw new Error("`payload` is required — give at least one field to set");
    }

    const rawIds = String(p.ids ?? "").trim();
    const filter = json(p.filter, "filter") as Record<string, unknown> | undefined;
    if (!rawIds && !filter) throw new Error("give `ids` or a `filter` to choose the points");
    if (filter && Object.keys(filter).length === 0) {
      throw new Error(
        "`filter` is empty, which would apply this payload to every point in the collection",
      );
    }

    const result = await new QdrantClient(ctx).request<{ status?: string }>(
      `/collections/${encodeURIComponent(collection)}/points/payload`,
      {
        method: "POST",
        body: compact({
          payload,
          points: rawIds ? pointIds(rawIds, "ids") : undefined,
          filter,
          key: p.key,
        }),
        query: { wait: p.wait === undefined ? true : p.wait === true },
      },
    );

    // The field names are safe to log; the values are the caller's data.
    ctx.log("info", "set Qdrant payload fields", {
      collection,
      fields: Object.keys(payload),
    });
    return result;
  },
};

export default action;

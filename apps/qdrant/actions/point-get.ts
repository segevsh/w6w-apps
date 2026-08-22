import type { ActionDefinition } from "@w6w/types";
import { compact, csv, pointIds, QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM } from "../lib/params.ts";

/**
 * `POST /collections/{name}/points` — fetch points by id.
 *
 * The lookup half of the API: no similarity, no scoring, just "give me these".
 * The natural second step after a query that returned ids, and the way to
 * re-read a point a workflow wrote earlier.
 *
 * ## A missing id is silence, not an error
 *
 * Asking for five ids and getting three back is a successful response. Qdrant
 * does not report which were absent, so a workflow that assumes a one-to-one
 * mapping between what it asked for and what it got will pair the wrong payload
 * with the wrong id. This action returns `missing` explicitly for that reason.
 *
 * Unlike `point-query`, payloads are on by Qdrant's own default here — which is
 * one more place the two endpoints disagree.
 */
const action: ActionDefinition = {
  key: "point-get",
  type: "read",
  resource: "point",
  title: "Get points by id",
  description:
    "Fetch specific points. Asking for five and getting three back is a SUCCESS — Qdrant does " +
    "not say which were missing, so this works it out.",
  params: [
    COLLECTION_PARAM,
    {
      key: "ids",
      label: "Point IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated, or a JSON array. Integers or UUIDs.",
    },
    {
      key: "withPayload",
      label: "Include Payload",
      type: "boolean",
      default: true,
    },
    {
      key: "withVector",
      label: "Include Vectors",
      type: "boolean",
      default: false,
      hint: "Hundreds of floats per point; only turn this on to copy points somewhere.",
    },
  ],
  output: [
    { key: "points", type: "array", label: "The points that exist" },
    { key: "count", type: "number", label: "Points returned" },
    { key: "missing", type: "array", label: "Ids that were asked for and did not come back" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");
    const ids = pointIds(p.ids, "ids");
    if (ids.length === 0) throw new Error("`ids` is required");

    const points = await new QdrantClient(ctx).request<Array<{ id?: string | number }>>(
      `/collections/${encodeURIComponent(collection)}/points`,
      {
        method: "POST",
        body: compact({
          ids,
          with_payload: p.withPayload === undefined ? true : p.withPayload === true,
          with_vector: p.withVector === true,
        }),
      },
    );

    const returned = Array.isArray(points) ? points : [];
    // Qdrant says nothing about ids it did not find.
    const found = new Set(returned.map((pt) => String(pt?.id)));
    const missing = ids.filter((id) => !found.has(String(id)));

    ctx.log("info", "read Qdrant points", {
      collection,
      count: returned.length,
      missing: missing.length,
    });
    return { points: returned, count: returned.length, missing };
  },
};

/** Exported for the tests, which check the comma and JSON forms. */
export const parseIds = csv;

export default action;

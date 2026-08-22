import type { ActionDefinition } from "@w6w/types";
import { json, QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM, WAIT_PARAM } from "../lib/params.ts";

/**
 * `PUT /collections/{name}/points` — insert or replace points.
 *
 * ## Upsert **replaces**, it does not merge
 *
 * A point with an existing id is overwritten entirely — vector and payload
 * both. So upserting `{id, vector}` on a point that had a payload **deletes the
 * payload**, silently and immediately. Adding a field to an existing point is
 * `payload-set`, not this.
 *
 * ## The write returns before it can be read
 *
 * Qdrant's `wait` defaults to false: the call returns once the operation is
 * accepted, not once it is queryable. A workflow that upserts and then searches
 * reliably fails to find what it just wrote. This action defaults `wait` to
 * **true**, which is the behaviour a sequential workflow assumes.
 *
 * ## Ids are integers or UUIDs, and nothing else
 *
 * A natural key — a URL, a filename, an external id — is rejected. The usual
 * answer is to hash it into a UUID and keep the original in the payload, where
 * a filter can still find it.
 *
 * ## The vector's dimension must match the collection exactly
 *
 * A mismatch is rejected, which is the good outcome. The bad one is a workflow
 * that changes embedding model and starts writing 1536-dimension vectors into a
 * 768-dimension collection — every write fails, and the collection has to be
 * recreated rather than altered.
 */
const action: ActionDefinition = {
  key: "point-upsert",
  type: "perform",
  resource: "point",
  title: "Upsert points",
  description:
    "Insert or REPLACE points — an existing id is overwritten entirely, so upserting without a " +
    "payload deletes the payload it had. Waits for the write by default.",
  idempotent: true,
  params: [
    COLLECTION_PARAM,
    {
      key: "points",
      label: "Points",
      type: "json",
      required: true,
      default: "",
      hint: '[{"id": 1, "vector": [0.1, 0.2], "payload": {"tenant": "acme"}}]. Ids are ' +
        "non-negative integers or UUIDs — hash a natural key and keep the original in the " +
        "payload. The vector's length must match the collection exactly.",
    },
    WAIT_PARAM,
    {
      key: "ordering",
      label: "Ordering",
      type: "select",
      default: "",
      advanced: true,
      options: [
        { value: "", label: "Weak — fastest, the default" },
        { value: "medium", label: "Medium — ordered via the current leader" },
        { value: "strong", label: "Strong — ordered via the permanent leader" },
      ],
      hint: "Only relevant on a replicated cluster.",
    },
  ],
  output: [
    { key: "operation_id", type: "number", label: "Qdrant's operation id" },
    { key: "status", type: "string", label: "acknowledged or completed" },
    { key: "count", type: "number", label: "Points sent" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const parsed = json(p.points, "points");
    const points = Array.isArray(parsed) ? parsed : parsed === undefined ? [] : [parsed];
    if (points.length === 0) throw new Error("`points` is required — give at least one point");
    for (const [i, point] of points.entries()) {
      const record = point as Record<string, unknown>;
      if (record?.id === undefined) throw new Error(`point ${i} has no \`id\``);
      if (record?.vector === undefined) {
        throw new Error(
          `point ${i} has no \`vector\` — upsert replaces a point entirely, so a point without ` +
            "one would erase the vector it had. Use `payload-set` to change only the payload",
        );
      }
    }

    const result = await new QdrantClient(ctx).request<{ status?: string }>(
      `/collections/${encodeURIComponent(collection)}/points`,
      {
        method: "PUT",
        body: { points },
        query: {
          wait: p.wait === undefined ? true : p.wait === true,
          ordering: String(p.ordering ?? "") || undefined,
        },
      },
    );

    // A count — never the points, which are the caller's data.
    ctx.log("info", "upserted points into Qdrant", { collection, count: points.length });
    return { ...result, count: points.length };
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM } from "../lib/params.ts";

/**
 * `GET /collections/{name}/exists` — does it exist?
 *
 * A one-field answer rather than a 404 to catch. That matters in a workflow
 * because the alternative is calling `collection-get` and treating the error as
 * a "no" — which also swallows a network failure, an expired key and a
 * misconfigured URL as "the collection is not there".
 *
 * The natural use is the create-if-missing pattern: check, then
 * `collection-create` only if it is absent. Creating an existing collection is
 * an error rather than a no-op, so the check is not optional.
 */
const action: ActionDefinition = {
  key: "collection-exists",
  type: "read",
  resource: "collection",
  title: "Check a collection exists",
  description:
    "A boolean rather than a 404 to catch — which matters, because catching the error would also " +
    "swallow a bad key or an unreachable host as 'not there'.",
  params: [COLLECTION_PARAM],
  output: [{ key: "exists", type: "boolean", label: "Whether the collection exists" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const result = await new QdrantClient(ctx).request<{ exists?: boolean }>(
      `/collections/${encodeURIComponent(collection)}/exists`,
    );
    return { exists: result?.exists === true };
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { QdrantClient } from "../lib/client.ts";
import { COLLECTION_PARAM } from "../lib/params.ts";

/**
 * `GET /collections/{name}` — one collection's configuration and state.
 *
 * ## `status` is the field that explains a slow or empty search
 *
 * `green` is ready. **`yellow`** means the optimiser is still building — the
 * collection answers queries and answers them slowly and possibly
 * incompletely, which is exactly what a freshly-loaded collection looks like.
 * **`grey`** means optimisations are pending, and `red` means an error.
 *
 * A workflow that bulk-loads and immediately queries is asking a `yellow`
 * collection for results, and getting fewer than it should. `ready` is returned
 * as an explicit boolean for that reason.
 *
 * ## The vector configuration is fixed at creation
 *
 * `size` and `distance` cannot be changed afterwards. A workflow that switches
 * embedding model needs a **new collection** and a re-embed, not an update —
 * which is worth reading here before discovering it one failed upsert at a
 * time.
 */
const action: ActionDefinition = {
  key: "collection-get",
  type: "read",
  resource: "collection",
  title: "Get a collection",
  description:
    "Configuration and state. `yellow` means the optimiser is still building — the collection " +
    "answers queries slowly and incompletely, which is what a fresh bulk load looks like.",
  params: [COLLECTION_PARAM],
  output: [
    { key: "status", type: "string", label: "green, yellow, grey or red" },
    { key: "ready", type: "boolean", label: "Status is green" },
    { key: "points_count", type: "number", label: "Points stored" },
    { key: "indexed_vectors_count", type: "number", label: "Vectors actually indexed" },
    { key: "config", type: "object", label: "Vector size and distance — fixed at creation" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const info = await new QdrantClient(ctx).request<{ status?: string }>(
      `/collections/${encodeURIComponent(collection)}`,
    );
    return { ...info, ready: info?.status === "green" };
  },
};

export default action;

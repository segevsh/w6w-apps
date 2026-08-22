import type { ActionDefinition } from "@w6w/types";
import { compact, json, QdrantClient } from "../lib/client.ts";

/**
 * `PUT /collections/{name}` — create a collection.
 *
 * ## The vector size and distance are permanent
 *
 * Neither can be changed afterwards. Switching embedding model — from a
 * 768-dimension model to a 1536-dimension one — means a **new collection and a
 * full re-embed**, not an update. Choosing the size to match the model in use is
 * the single decision this action exists to get right, and it is the one nobody
 * revisits until it is expensive.
 *
 * ## Distance must match how the model was trained
 *
 * `Cosine` for most sentence-embedding models, `Dot` for models producing
 * normalised vectors where the dot product is the intended similarity, `Euclid`
 * for genuine spatial data, `Manhattan` rarely. The wrong choice does not
 * error: it returns results, ranked by the wrong notion of closeness, and the
 * search simply seems poor.
 *
 * ## Creating an existing collection is an error
 *
 * Not a no-op. `collection-exists` first is the create-if-missing pattern.
 */
const action: ActionDefinition = {
  key: "collection-create",
  type: "perform",
  resource: "collection",
  title: "Create a collection",
  description:
    "Create a collection. Vector size and distance are PERMANENT — changing embedding model " +
    "later means a new collection and a full re-embed, not an update.",
  idempotent: false,
  params: [
    {
      key: "collection",
      label: "Name",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "vectorSize",
      label: "Vector Size",
      type: "number",
      required: true,
      default: 1536,
      hint: "The embedding model's dimension — 1536 for OpenAI text-embedding-3-small, 768 for " +
        "many sentence-transformers. Permanent.",
    },
    {
      key: "distance",
      label: "Distance",
      type: "select",
      required: true,
      default: "Cosine",
      options: [
        { value: "Cosine", label: "Cosine — most sentence-embedding models" },
        { value: "Dot", label: "Dot — normalised vectors" },
        { value: "Euclid", label: "Euclid — genuine spatial data" },
        { value: "Manhattan", label: "Manhattan" },
      ],
      hint: "Must match how the model was trained. The wrong choice does not error — it ranks by " +
        "the wrong notion of closeness and the search just seems poor.",
    },
    {
      key: "onDisk",
      label: "Store Vectors on Disk",
      type: "boolean",
      default: false,
      hint: "Trades query latency for memory. Worth it for a large collection that is queried " +
        "occasionally, and not for a small one that is queried constantly.",
    },
    {
      key: "sparseVectors",
      label: "Sparse Vectors",
      type: "json",
      default: "",
      advanced: true,
      hint: 'e.g. {"text": {}} — needed for hybrid search combining keyword and dense retrieval.',
    },
    {
      key: "vectors",
      label: "Named Vectors",
      type: "json",
      default: "",
      advanced: true,
      hint: "For several vectors per point. Replaces the size and distance above entirely.",
    },
  ],
  output: [
    { key: "created", type: "boolean", label: "Whether the collection was created" },
    { key: "collection", type: "string", label: "Its name" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const collection = String(p.collection ?? "").trim();
    if (!collection) throw new Error("`collection` is required");

    const named = json(p.vectors, "vectors");
    const size = Number(p.vectorSize ?? 0);
    if (!named && (!Number.isInteger(size) || size <= 0)) {
      throw new Error(
        "`vectorSize` must be a positive integer — it is the embedding model's dimension, and it " +
          "cannot be changed after the collection exists",
      );
    }

    const vectors = named ?? {
      size,
      distance: p.distance === undefined ? "Cosine" : String(p.distance),
      on_disk: p.onDisk === true ? true : undefined,
    };

    await new QdrantClient(ctx).request(`/collections/${encodeURIComponent(collection)}`, {
      method: "PUT",
      body: compact({
        vectors,
        sparse_vectors: json(p.sparseVectors, "sparseVectors"),
      }),
    });

    ctx.log("info", "created a Qdrant collection", {
      collection,
      vectorSize: named ? undefined : size,
    });
    return { created: true, collection };
  },
};

export default action;

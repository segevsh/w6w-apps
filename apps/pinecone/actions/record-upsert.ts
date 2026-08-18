import type { ActionDefinition } from "@w6w/types";
import { json, MAX_UPSERT_VECTORS, PineconeClient } from "../lib/client.ts";
import { INDEX_PARAMS, NAMESPACE_PARAM } from "../lib/params.ts";

/**
 * `POST /vectors/upsert` on the index's own host — verified against Pinecone's
 * own `db_data` OpenAPI document (`upsert_vectors`).
 *
 * Upsert is **write-or-replace by id**: a record whose id already exists is
 * overwritten wholesale, values and metadata together. That is what makes it
 * safe to retry — the same call twice leaves the same state — and it is also
 * why it is not a merge. Sending a record with values but no metadata *erases*
 * the metadata that was there. `record-update` is the partial-write route.
 *
 * ## Limits that fail the whole batch
 *
 * Pinecone caps one upsert at **1000 vectors or 2 MB**, whichever comes first,
 * and the size ceiling is the one that bites: at 1536 dimensions with 2 KB of
 * metadata, about 245 records fit in 2 MB. The count is checked here; the byte
 * limit is Pinecone's to enforce, and it answers `400` for the whole request
 * rather than accepting a prefix.
 *
 * ## The dimension has to match, exactly
 *
 * Every vector must have the index's dimension. Pinecone's message —
 * *"Vector dimension 384 does not match the dimension of the index 1536"* — is
 * clear once you see it, but it arrives after the batch is rejected; the vector
 * lengths in the batch are checked for consistency before that.
 */
const action: ActionDefinition = {
  key: "record-upsert",
  type: "perform",
  resource: "record",
  title: "Upsert vectors",
  description:
    "Write or replace records by id. A record that exists is overwritten whole — metadata " +
    "included — so this is replace, not merge. Up to 1000 vectors or 2 MB per call.",
  idempotent: true,
  params: [
    ...INDEX_PARAMS,
    NAMESPACE_PARAM,
    {
      key: "vectors",
      label: "Vectors",
      type: "json",
      required: true,
      default: "",
      hint: 'Array of `{"id":"…","values":[…],"metadata":{…}}`. Ids are up to 512 characters; ' +
        "metadata up to 40 KB per record.",
    },
  ],
  output: [
    { key: "upsertedCount", type: "number", label: "Upserted count" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const vectors = json(p.vectors, "vectors");
    if (!Array.isArray(vectors) || vectors.length === 0) {
      throw new Error("`vectors` must be a non-empty array");
    }
    if (vectors.length > MAX_UPSERT_VECTORS) {
      throw new Error(
        `Pinecone accepts at most ${MAX_UPSERT_VECTORS} vectors per upsert; got ` +
          `${vectors.length}. Split the batch — the whole request is rejected, not the excess.`,
      );
    }

    // A ragged batch is always a bug, and Pinecone reports it as a dimension
    // mismatch against the index, which sends people looking in the wrong place.
    const dims = new Set<number>();
    for (const [i, v] of vectors.entries()) {
      const rec = v as { id?: unknown; values?: unknown };
      if (!rec?.id) throw new Error(`vector at position ${i} has no \`id\``);
      if (Array.isArray(rec.values)) dims.add(rec.values.length);
    }
    if (dims.size > 1) {
      throw new Error(
        `this batch mixes vector lengths (${[...dims].join(", ")}) — every record must have the ` +
          "index's dimension",
      );
    }

    ctx.log("info", "upserting Pinecone vectors", {
      count: vectors.length,
      dimension: [...dims][0],
      namespace: p.namespace ?? "",
    });

    return await new PineconeClient(ctx).data(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
      "/vectors/upsert",
      { method: "POST", body: { vectors, namespace: String(p.namespace ?? "") } },
    );
  },
};

export default action;

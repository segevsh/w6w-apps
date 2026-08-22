import type { ActionDefinition } from "@w6w/types";
import { json, MAX_TOP_K, PineconeClient, vector } from "../lib/client.ts";
import { FILTER_PARAM, INDEX_PARAMS, NAMESPACE_PARAM } from "../lib/params.ts";

/**
 * `POST /query` on the index's own host — verified against Pinecone's own
 * `db_data` OpenAPI document (`query_vectors`).
 *
 * Similarity search by **vector**, which means the caller has already embedded
 * the query with the *same model* the records were embedded with. Using a
 * different model returns results — they are simply meaningless, ranked by the
 * geometry of an unrelated space. That failure is silent, and it is the main
 * argument for an integrated-embedding index and `record-search` instead.
 *
 * A query can also be made **by id**: give the id of a record already in the
 * index and Pinecone uses its vector. That is how "more like this" is built,
 * and it costs no embedding call. Exactly one of vector or id may be given.
 *
 * ## Two defaults that surprise people
 *
 * `includeValues` and `includeMetadata` both default to **`false`** — a plain
 * query returns ids and scores and nothing else. Metadata is almost always what
 * a workflow wants back, so it defaults to on here; values almost never are,
 * and on on-demand indexes fetching them costs latency, so they stay off.
 *
 * `topK` may not exceed 10,000, and asking for more is a `400`.
 */
const action: ActionDefinition = {
  key: "record-query",
  type: "search",
  resource: "record",
  title: "Query by vector",
  description:
    "Similarity search from a query vector — or from the id of a record already in the index, " +
    "which is how 'more like this' works. Embed the query with the SAME model as the records.",
  params: [
    ...INDEX_PARAMS,
    NAMESPACE_PARAM,
    {
      key: "vector",
      label: "Query Vector",
      type: "json",
      default: "",
      hint: "The embedded query, as an array of numbers. Must have the index's dimension, and " +
        "must come from the same model the records were embedded with.",
    },
    {
      key: "id",
      label: "Query By Record ID",
      type: "string",
      default: "",
      hint: "Instead of a vector: use an existing record's own vector. Mutually exclusive with " +
        "Query Vector.",
    },
    {
      key: "topK",
      label: "Top K",
      type: "number",
      default: 10,
      hint: `How many matches to return. Pinecone's ceiling is ${MAX_TOP_K}.`,
    },
    FILTER_PARAM,
    {
      key: "includeMetadata",
      label: "Include Metadata",
      type: "boolean",
      default: true,
      hint: "Pinecone's own default is `false` — a bare query returns ids and scores only.",
    },
    {
      key: "includeValues",
      label: "Include Values",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Off by design: on on-demand indexes the vectors come from object storage, so " +
        "asking for them adds latency at every topK.",
    },
  ],
  output: [
    { key: "matches", type: "array", label: "Matches" },
    { key: "namespace", type: "string", label: "Namespace" },
    { key: "usage", type: "object", label: "Usage (read units)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const queryVector = vector(p.vector, "vector");
    const id = String(p.id ?? "").trim();
    if (queryVector && id) {
      throw new Error("give either `vector` or `id`, not both — Pinecone accepts one query point");
    }
    if (!queryVector && !id) {
      throw new Error("one of `vector` or `id` is required");
    }
    const topK = Number(p.topK ?? 10);
    if (!Number.isFinite(topK) || topK < 1) throw new Error("`topK` must be a positive number");
    if (topK > MAX_TOP_K) throw new Error(`Pinecone's ceiling for \`topK\` is ${MAX_TOP_K}`);

    const body: Record<string, unknown> = {
      namespace: String(p.namespace ?? ""),
      // camelCase — the vector API's convention, unlike the records API's
      // snake_case. Both live on the same host.
      topK,
      includeMetadata: p.includeMetadata !== false,
      includeValues: p.includeValues === true,
    };
    if (queryVector) body.vector = queryVector;
    if (id) body.id = id;
    const filter = json(p.filter, "filter");
    if (filter !== undefined) body.filter = filter;

    ctx.log("info", "querying Pinecone", {
      by: id ? "id" : "vector",
      dimension: queryVector?.length,
      topK,
    });

    return await new PineconeClient(ctx).data(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
      "/query",
      { method: "POST", body },
    );
  },
};

export default action;

import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, PineconeClient } from "../lib/client.ts";
import { INDEX_PARAMS } from "../lib/params.ts";

/**
 * `POST /records/namespaces/{namespace}/search` on the index's own host —
 * verified against Pinecone's own `db_data` OpenAPI document
 * (`search_records_namespace`).
 *
 * **Search by text.** On an integrated-embedding index Pinecone embeds the
 * query with the same model it embedded the records with, which removes the one
 * mistake that quietly ruins vector search: querying a space with the wrong
 * model's geometry.
 *
 * It also has something `record-query` does not — an optional **rerank** stage.
 * Vector similarity is a coarse first pass; a cross-encoder reranker reads the
 * query and each candidate together and reorders them, which is usually worth
 * more than a larger `topK`. The normal shape is to retrieve generously
 * (`topK: 50`) and return few (`topN: 5`), and that is what the params default
 * towards.
 *
 * Note the convention change: this route is **snake_case** (`top_k`,
 * `rank_fields`, `top_n`) while `/query` on the very same host is **camelCase**
 * (`topK`, `includeMetadata`). That is Pinecone's own inconsistency, not a typo
 * here — the two APIs were designed at different times.
 */
const action: ActionDefinition = {
  key: "record-search",
  type: "search",
  resource: "record",
  title: "Search by text",
  description:
    "Semantic search from a text query on an integrated-embedding index — no embedding call, " +
    "and an optional reranker that reads query and candidate together.",
  params: [
    ...INDEX_PARAMS,
    {
      key: "namespace",
      label: "Namespace",
      type: "string",
      default: "",
      hint: "Empty is Pinecone's default namespace. It goes in the URL path for this route.",
    },
    {
      key: "query",
      label: "Query Text",
      type: "text",
      required: true,
      default: "",
      placeholder: "how do I rotate an API key?",
    },
    {
      key: "topK",
      label: "Top K",
      type: "number",
      default: 10,
      hint: "How many candidates to retrieve. With reranking on, retrieve generously — the " +
        "reranker only reorders what it is given.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      hint: "Comma-separated fields to return. Empty returns them all.",
    },
    {
      key: "filter",
      label: "Metadata Filter",
      type: "json",
      default: "",
      hint: 'MongoDB-style, e.g. `{"category":{"$eq":"docs"}}`.',
    },
    {
      key: "rerankModel",
      label: "Rerank With",
      type: "string",
      default: "",
      placeholder: "bge-reranker-v2-m3",
      hint: "Leave empty for no reranking. `model-list` shows the rerank models available.",
    },
    {
      key: "rerankFields",
      label: "Rerank Fields",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated fields the reranker reads. Pinecone defaults to `text`, which is " +
        "wrong if your text field is called something else — usually it should match the " +
        "index's field map.",
    },
    {
      key: "topN",
      label: "Top N After Reranking",
      type: "number",
      default: 0,
      advanced: true,
      hint: "How many to keep after reranking. 0 means keep all of Top K.",
    },
  ],
  output: [
    { key: "result", type: "object", label: "Result (hits)" },
    { key: "usage", type: "object", label: "Usage (read units, embed and rerank)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const query = String(p.query ?? "").trim();
    if (!query) throw new Error("`query` is required");
    const topK = Number(p.topK ?? 10);
    if (!Number.isFinite(topK) || topK < 1) throw new Error("`topK` must be a positive number");

    const rerankModel = String(p.rerankModel ?? "").trim();
    const topN = Number(p.topN ?? 0);

    // snake_case here; /query on the same host is camelCase. Pinecone's own
    // inconsistency.
    const body = compact({
      query: compact({
        top_k: topK,
        inputs: { text: query },
        filter: json(p.filter, "filter"),
      }),
      fields: csv(p.fields),
      rerank: rerankModel
        ? compact({
          model: rerankModel,
          rank_fields: csv(p.rerankFields),
          top_n: Number.isFinite(topN) && topN > 0 ? topN : undefined,
        })
        : undefined,
    });

    const namespace = String(p.namespace ?? "");
    ctx.log("info", "searching Pinecone by text", {
      namespace,
      topK,
      rerank: Boolean(rerankModel),
    });

    return await new PineconeClient(ctx).data(
      String(p.indexName ?? ""),
      p.indexHost as string | undefined,
      `/records/namespaces/${encodeURIComponent(namespace)}/search`,
      { method: "POST", body },
    );
  },
};

export default action;

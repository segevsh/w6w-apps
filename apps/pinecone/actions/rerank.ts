import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, PineconeClient } from "../lib/client.ts";

/**
 * `POST /rerank` on the control plane — verified against Pinecone's own
 * `inference` OpenAPI document (`rerank`).
 *
 * A cross-encoder that reads the query and each document **together** and
 * scores the pair, rather than comparing two independently-produced vectors.
 * It is slower and much more accurate, which is why the standard retrieval
 * shape is "retrieve 50 by vector, rerank, keep 5" — and why reranking
 * generally buys more than raising `topK`.
 *
 * It is not tied to an index, or even to Pinecone-stored data: the documents
 * come in the request. Reranking the output of a database query, a web search
 * or another vector store is a legitimate and useful use of this action.
 *
 * `rank_fields` defaults to `["text"]`, which is the trap: documents whose text
 * lives under any other key rerank against nothing and come back in an order
 * that looks arbitrary because it is. The field name is asked for explicitly
 * here.
 */
const action: ActionDefinition = {
  key: "rerank",
  type: "perform",
  resource: "inference",
  title: "Rerank documents",
  description:
    "Reorder candidate documents against a query with a cross-encoder. Works on any documents, " +
    "not just Pinecone's — reranking a database or web result set is a fine use of it.",
  idempotent: true,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      default: "bge-reranker-v2-m3",
      hint: "`model-list` shows the rerank models — bge-reranker-v2-m3, cohere-rerank-3.5, " +
        "pinecone-rerank-v0.",
    },
    {
      key: "query",
      label: "Query",
      type: "text",
      required: true,
      default: "",
    },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      default: "",
      hint: 'Array of objects, e.g. `[{"id":"1","text":"…"}]`. Plain strings are accepted and ' +
        "wrapped as `{text}`.",
    },
    {
      key: "rankFields",
      label: "Rank Fields",
      type: "string",
      default: "text",
      hint: "Comma-separated fields the model reads. Pinecone's default is `text`; documents " +
        "whose content is under another key rerank against nothing.",
    },
    {
      key: "topN",
      label: "Top N",
      type: "number",
      default: 0,
      hint: "How many to keep. 0 returns every document, reordered.",
    },
    {
      key: "returnDocuments",
      label: "Return Documents",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "Off returns indices and scores only, which is enough if you still hold the " +
        "originals.",
    },
    {
      key: "parameters",
      label: "Extra Parameters",
      type: "json",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "model", type: "string", label: "Model" },
    { key: "data", type: "array", label: "Reranked results" },
    { key: "usage", type: "object", label: "Usage (rerank units)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const model = String(p.model ?? "").trim();
    if (!model) throw new Error("`model` is required");
    const query = String(p.query ?? "").trim();
    if (!query) throw new Error("`query` is required");

    const raw = json(p.documents, "documents");
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("`documents` must be a non-empty array");
    }
    const documents = raw.map((d) =>
      typeof d === "string" ? { text: d } : d as Record<string, unknown>
    );

    const topN = Number(p.topN ?? 0);
    ctx.log("info", "reranking with Pinecone", { model, documents: documents.length });

    return await new PineconeClient(ctx).request("/rerank", {
      method: "POST",
      body: compact({
        model,
        query,
        documents,
        rank_fields: csv(p.rankFields),
        top_n: Number.isFinite(topN) && topN > 0 ? topN : undefined,
        return_documents: p.returnDocuments !== false,
        parameters: json(p.parameters, "parameters"),
      }),
    });
  },
};

export default action;

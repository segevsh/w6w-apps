import type { ActionDefinition } from "@w6w/types";
import { compact, csv, MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `POST /indexes/{indexUid}/similar` — verified against Meilisearch's OpenAPI
 * document (`similar_post`).
 *
 * "More like this" — recommendations from one document rather than from a
 * query string. **It requires a configured embedder**: similarity here is
 * vector similarity, so the index needs an entry in its `embedders` setting and
 * documents that have been embedded. Without one the call fails rather than
 * falling back to keyword matching, which is the right behaviour and an easy
 * surprise.
 */
const action: ActionDefinition = {
  key: "similar-documents",
  type: "read",
  resource: "document",
  title: "Find similar documents",
  description: "Recommend documents similar to one you name. Requires a configured embedder.",
  params: [
    INDEX_PARAM,
    {
      key: "id",
      label: "Document ID",
      type: "string",
      required: true,
      default: "",
      hint: "The document to find neighbours of.",
    },
    {
      key: "embedder",
      label: "Embedder",
      type: "string",
      required: true,
      default: "default",
      hint: "The name of an embedder in the index's `embedders` setting.",
    },
    { key: "limit", label: "Limit", type: "number", default: 20 },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      default: "",
      hint: "Narrows the candidates, in Meilisearch's filter syntax.",
    },
    {
      key: "attributesToRetrieve",
      label: "Fields To Return",
      type: "string",
      default: "",
      hint: "Comma-separated.",
    },
  ],
  output: [
    { key: "hits", type: "array", label: "Similar documents" },
    { key: "id", type: "string", label: "The document they are similar to" },
    { key: "estimatedTotalHits", type: "number", label: "Estimated matches" },
    { key: "processingTimeMs", type: "number", label: "Processing time (ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);
    const id = String(p.id ?? "").trim();
    if (!id) throw new Error("`id` is required");
    const embedder = String(p.embedder ?? "").trim();
    if (!embedder) {
      throw new Error("`embedder` is required — similarity here is vector similarity");
    }

    ctx.log("info", "finding similar Meilisearch documents", { index, embedder });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/similar`,
      {
        method: "POST",
        body: {
          ...compact({
            filter: p.filter,
            attributesToRetrieve: csv(p.attributesToRetrieve),
          }),
          id,
          embedder,
          limit: Number(p.limit ?? 20),
          offset: Number(p.offset ?? 0),
        },
      },
    );
  },
};

export default action;

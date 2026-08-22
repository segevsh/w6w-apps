import type { ActionDefinition } from "@w6w/types";
import { csv, MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /indexes/{indexUid}/documents` — verified against Meilisearch's OpenAPI
 * document (`get_documents`).
 *
 * Reads documents **without searching** — no relevance, no ranking, just the
 * index's own order. That is the right tool for exporting or reconciling, and
 * the wrong one for anything a user typed.
 *
 * Unlike search, this is offset-paged with the `{results, offset, limit, total}`
 * envelope, so Return All walks it.
 */
const action: ActionDefinition = {
  key: "document-list",
  type: "read",
  resource: "document",
  title: "List documents",
  description: "Read documents from an index in index order, without searching.",
  params: [
    INDEX_PARAM,
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      hint: "Comma-separated. Blank returns whole documents.",
    },
    {
      key: "filter",
      label: "Filter",
      type: "string",
      default: "",
      hint: "Meilisearch's filter syntax. The attributes must be filterable.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Meilisearch documents", { index, returnAll, limit });

    return await new MeilisearchClient(ctx).requestAll(
      `/indexes/${encodeURIComponent(index)}/documents`,
      {
        query: {
          fields: csv(p.fields)?.join(","),
          filter: (p.filter as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;

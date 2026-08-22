import type { ActionDefinition } from "@w6w/types";
import { MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `GET /indexes/{indexUid}/settings` — verified against Meilisearch's OpenAPI
 * document (`get_all`).
 *
 * Meilisearch exposes each setting at its own sub-path as well — thirty-odd of
 * them, `/settings/synonyms`, `/settings/stop-words`, `/settings/typo-tolerance`
 * and so on. This app reads and writes the **whole object** instead, because
 * shipping thirty near-identical actions would be a worse surface than one that
 * matches how the settings are actually reasoned about: as a single
 * configuration for the index.
 *
 * The two that decide whether a search works at all are `filterableAttributes`
 * and `sortableAttributes` — a filter or sort naming an attribute missing from
 * them fails rather than being ignored.
 */
const action: ActionDefinition = {
  key: "settings-get",
  type: "read",
  resource: "settings",
  title: "Get index settings",
  description: "Read an index's whole settings object.",
  params: [INDEX_PARAM],
  output: [
    { key: "searchableAttributes", type: "array", label: "Searchable attributes, in rank order" },
    { key: "filterableAttributes", type: "array", label: "Filterable — a filter needs these" },
    { key: "sortableAttributes", type: "array", label: "Sortable — a sort needs these" },
    { key: "displayedAttributes", type: "array", label: "Returned in results" },
    { key: "rankingRules", type: "array", label: "Ranking rules, in order" },
    { key: "stopWords", type: "array", label: "Stop words" },
    { key: "synonyms", type: "object", label: "Synonyms" },
    { key: "typoTolerance", type: "object", label: "Typo tolerance" },
    { key: "faceting", type: "object", label: "Faceting" },
    { key: "pagination", type: "object", label: "Pagination" },
    { key: "embedders", type: "object", label: "Embedders — needed for similar documents" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);

    ctx.log("info", "getting Meilisearch index settings", { index });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/settings`,
    );
  },
};

export default action;

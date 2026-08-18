import type { ActionDefinition } from "@w6w/types";
import { compact, csv, json, MeilisearchClient, resolveIndex } from "../lib/client.ts";
import { INDEX_PARAM, TASK_OUTPUT } from "../lib/params.ts";

/**
 * `PATCH /indexes/{indexUid}/settings` — verified against Meilisearch's OpenAPI
 * document (`update_all`).
 *
 * A `PATCH`, so settings left out are untouched — which is why every field here
 * is optional and unset ones are dropped rather than sent empty. Sending
 * `"searchableAttributes": []` is not "leave it alone"; it is "nothing is
 * searchable".
 *
 * **Changing a setting re-indexes.** `searchableAttributes`, `rankingRules`,
 * `filterableAttributes` and the rest are structural: Meilisearch rebuilds the
 * index to apply them, and on a large index that takes time during which
 * results shift. This is a task like every other write, so the call returns
 * before any of that has happened.
 *
 * The two that decide whether a search works at all are `filterableAttributes`
 * and `sortableAttributes`. A filter naming an attribute that is not filterable
 * fails with `invalid_search_filter` — it does not quietly return everything.
 */
const action: ActionDefinition = {
  key: "settings-update",
  type: "perform",
  resource: "settings",
  title: "Update index settings",
  description: "Enqueue a settings change. Unset fields are left alone; changes re-index.",
  idempotent: true,
  params: [
    INDEX_PARAM,
    {
      key: "searchableAttributes",
      label: "Searchable Attributes",
      type: "string",
      default: "",
      hint: "Comma-separated, in order of importance. Earlier attributes rank higher.",
    },
    {
      key: "filterableAttributes",
      label: "Filterable Attributes",
      type: "string",
      default: "",
      hint: "Comma-separated. A filter naming anything not listed here FAILS.",
    },
    {
      key: "sortableAttributes",
      label: "Sortable Attributes",
      type: "string",
      default: "",
      hint: "Comma-separated. A sort naming anything not listed here fails.",
    },
    {
      key: "displayedAttributes",
      label: "Displayed Attributes",
      type: "string",
      default: "",
      hint: "Comma-separated. Which attributes come back in results.",
    },
    {
      key: "stopWords",
      label: "Stop Words",
      type: "string",
      default: "",
      hint: "Comma-separated words to ignore when searching.",
    },
    {
      key: "rankingRules",
      label: "Ranking Rules",
      type: "string",
      default: "",
      placeholder: "words, typo, proximity, attribute, sort, exactness",
      hint: "Comma-separated, in order. Reordering these changes every result.",
    },
    {
      key: "synonyms",
      label: "Synonyms",
      type: "json",
      default: "",
      placeholder: '{"film":["movie"],"movie":["film"]}',
      hint: "Synonyms are one-directional — list both ways to make them mutual.",
    },
    {
      key: "typoTolerance",
      label: "Typo Tolerance",
      type: "json",
      default: "",
      placeholder: '{"enabled":true,"minWordSizeForTypos":{"oneTypo":5,"twoTypos":9}}',
    },
    {
      key: "faceting",
      label: "Faceting",
      type: "json",
      default: "",
      placeholder: '{"maxValuesPerFacet":100}',
    },
    {
      key: "extra",
      label: "Additional Settings",
      type: "json",
      default: "",
      placeholder: '{"embedders":{"default":{"source":"openAi"}}}',
      hint: "Merged in, for settings this form does not name — embedders, distinct attribute, " +
        "proximity precision and the rest.",
    },
  ],
  output: TASK_OUTPUT,

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const index = resolveIndex(ctx.connection, p.indexUid);

    const extra = json(p.extra, "extra");
    if (extra !== undefined && (typeof extra !== "object" || Array.isArray(extra))) {
      throw new Error("`extra` must be a JSON object of settings");
    }

    const body: Record<string, unknown> = {
      ...compact({
        searchableAttributes: csv(p.searchableAttributes),
        filterableAttributes: csv(p.filterableAttributes),
        sortableAttributes: csv(p.sortableAttributes),
        displayedAttributes: csv(p.displayedAttributes),
        stopWords: csv(p.stopWords),
        rankingRules: csv(p.rankingRules),
        synonyms: json(p.synonyms, "synonyms"),
        typoTolerance: json(p.typoTolerance, "typoTolerance"),
        faceting: json(p.faceting, "faceting"),
      }),
      ...((extra as Record<string, unknown>) ?? {}),
    };
    if (Object.keys(body).length === 0) {
      throw new Error("nothing to update — set at least one setting");
    }

    ctx.log("info", "enqueueing a Meilisearch settings change", {
      index,
      settings: Object.keys(body),
    });

    return await new MeilisearchClient(ctx).request(
      `/indexes/${encodeURIComponent(index)}/settings`,
      { method: "PATCH", body },
    );
  },
};

export default action;

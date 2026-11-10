import type { TriggerDefinition } from "@w6w/types";
import articlesSearch from "../actions/articles-search.ts";
import { pollWindow } from "../lib/window.ts";

interface Article {
  id?: unknown;
  crawled?: unknown;
}

const OVERLAP_MS = 120_000;
const PAGE_SIZE = 100;
/** Pages read per check; a larger window resumes from the saved continuation token. */
const MAX_PAGES = 5;
/** Feedly rejects `newerThan` older than 31 days; stay inside it. */
const MAX_LOOKBACK_MS = 30 * 86_400_000;

/**
 * `POST /v3/search/contents` with the user's saved-search body and `newerThan` = the previous
 * check's time minus a two-minute overlap, deduped by article `id`. The Search reference documents
 * `newerThan` only as "Long timestamp in ms" (it does not say which article time it compares; the
 * stream endpoint compares crawl time, which the 2-minute overlap and the `crawled` floor assume
 * here too) and pages by `continuation`; a window longer than five pages resumes from the saved
 * token on the next check. https://developers.feedly.com/reference/search.md
 */
const trigger: TriggerDefinition<{ query: unknown }> = {
  key: "new-search-article",
  title: "New Article Matching a Search",
  description:
    "The run gets each new article that matches a Feedly AI search (the query JSON from a saved search's API button).",
  params: [{
    key: "query",
    label: "Query (JSON)",
    type: "json",
    required: true,
    hint:
      "The search body, copied from the API button on a saved search in Feedly (layers + source).",
  }],
  output: [
    { key: "id", type: "string", label: "Article ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "published", type: "number", label: "Published (epoch ms)" },
    { key: "crawled", type: "number", label: "Crawled (epoch ms)" },
    { key: "originId", type: "string", label: "Original URL" },
  ],
  sample: {
    id: "AbCdEf==_18f3a1b2c3d:1a2b:3c4d5e6f",
    title: "A new threat report",
    published: 1794268800000,
    crawled: 1794268810000,
    originId: "https://example.com/report",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const now = Date.now();
    return await pollWindow<Article, string>({
      state,
      now,
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: 1000,
      idOf: (article) => String(article.id ?? ""),
      tsOf: (article) => typeof article.crawled === "number" ? article.crawled : undefined,
      async load(since, continuation) {
        const page = await articlesSearch.execute!({
          query: params.query,
          count: PAGE_SIZE,
          newerThan: Math.max(since, now - MAX_LOOKBACK_MS),
          continuation,
        }, ctx) as { items?: Article[]; continuation?: string };
        return {
          items: Array.isArray(page?.items) ? page.items : [],
          next: page?.continuation || undefined,
        };
      },
    });
  },
};

export default trigger;

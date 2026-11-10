import type { TriggerDefinition } from "@w6w/types";
import { pollWindow } from "../lib/window.ts";
import articlesCollect from "../actions/articles-collect.ts";

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
 * `GET /v3/streams/contents` with `newerThan` = the previous check's time (Feedly's own wording:
 * "the time of your previous call") minus a two-minute overlap, deduped by article `id`. A window longer than five pages resumes from the saved
 * `continuation` on the next check and the cursor advances only once it drains.
 */
const trigger: TriggerDefinition<{ streamId: string }> = {
  key: "new-article",
  title: "New Article",
  description:
    "The run gets each new article collected into a Feedly stream (folder, board or AI Feed).",
  params: [{
    key: "streamId",
    label: "Stream ID",
    type: "string",
    required: true,
    hint: "e.g. enterprise/acme/category/<uuid>. From folders-list, boards-list or ai-feeds-list.",
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
      // `newerThan` compares the crawl time.
      tsOf: (article) => typeof article.crawled === "number" ? article.crawled : undefined,
      async load(since, continuation) {
        const page = await articlesCollect.execute!({
          streamId: params.streamId,
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

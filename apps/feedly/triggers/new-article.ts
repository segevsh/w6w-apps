import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import articlesCollect from "../actions/articles-collect.ts";

interface Article {
  id?: unknown;
}

const OVERLAP_MS = 120_000;
/** Feedly rejects `newerThan` older than 31 days; stay inside it. */
const MAX_LOOKBACK_MS = 30 * 86_400_000;

function cursorOf(state: unknown, now: number): number {
  const cursor = state && typeof state === "object" ? (state as { cursor?: unknown }).cursor : null;
  return typeof cursor === "number" && Number.isFinite(cursor) ? cursor : now;
}

/**
 * `GET /v3/streams/contents` with `newerThan` = the previous check's time (Feedly's own wording:
 * "the time of your previous call") minus a two-minute overlap, deduped by article `id`.
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
    const newerThan = Math.max(cursorOf(state, now) - OVERLAP_MS, now - MAX_LOOKBACK_MS);
    const polled = await pollNewItems<Article>({
      state,
      maxPages: 1,
      maxEvents: 100,
      seenWindow: 400,
      idOf: (article) => String(article.id ?? ""),
      async fetchPage() {
        const page = await articlesCollect.execute!(
          { streamId: params.streamId, count: 100, newerThan },
          ctx,
        ) as { items?: Article[] };
        return { items: Array.isArray(page?.items) ? page.items : [] };
      },
    });
    return { events: polled.events, nextState: { ...polled.nextState, cursor: now } };
  },
};

export default trigger;

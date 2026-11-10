import type { TriggerDefinition } from "@w6w/types";
import { pollWindow, toMs } from "../lib/window.ts";
import crawlList from "../actions/crawl-list.ts";

/** The vendor maximum per page (1-100); 10 pages is the most one check will walk. */
export const PAGE_SIZE = 100;
export const MAX_PAGES = 10;
const OVERLAP_MS = 120_000;
const SEEN_WINDOW = MAX_PAGES * PAGE_SIZE + PAGE_SIZE;

interface Crawl {
  id?: string;
  createdAt?: string;
}

interface CrawlPage {
  crawls?: Crawl[];
  data?: Crawl[];
  nextCursor?: string | null;
}

/**
 * The crawl listing documents no order and no since filter
 * (https://docs.browserless.io/rest-apis/crawl), so a check walks `nextCursor` and keeps the crawls
 * created inside the window (`cursor - overlap`) on the client. A listing longer than `MAX_PAGES`
 * pages is resumed from the persisted `nextCursor` on the next check and the cursor moves only once
 * the listing drains (brief 9.8); the seed stores `floor = now` and later checks drop crawls
 * created before it (brief 9.9). Crawls without a parseable `createdAt` are kept.
 */
const trigger: TriggerDefinition = {
  key: "new-crawl",
  title: "New Crawl",
  description: "The run gets each newly created crawl job.",
  output: [
    { key: "id", type: "string", label: "Crawl ID" },
    { key: "url", type: "string", label: "Root URL" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "crawl_abc123def456",
    url: "https://example.com",
    status: "in-progress",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return pollWindow<Crawl, string>({
      state,
      now: Date.now(),
      overlapMs: OVERLAP_MS,
      maxPages: MAX_PAGES,
      pageSize: PAGE_SIZE,
      seenWindow: SEEN_WINDOW,
      idOf: (c) => String(c.id),
      tsOf: (c) => toMs(c.createdAt),
      async load(sinceMs, cursor) {
        const res = await crawlList.execute({ limit: PAGE_SIZE, cursor }, ctx) as {
          data?: CrawlPage;
        };
        const all = res.data?.crawls ?? res.data?.data ?? [];
        const items = sortNewestFirst(all).filter((c) => {
          const ts = toMs(c.createdAt);
          return ts === undefined || ts >= sinceMs;
        });
        return { items, next: res.data?.nextCursor || undefined, read: all.length };
      },
    });
  },
};

function sortNewestFirst(items: Crawl[]): Crawl[] {
  return [...items].sort((a, b) =>
    String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
  );
}

export default trigger;

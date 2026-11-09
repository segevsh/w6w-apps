import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import crawlList from "../actions/crawl-list.ts";

/** The vendor maximum per page (1-100); 10 pages is the most one check will walk. */
export const PAGE_SIZE = 100;
export const MAX_PAGES = 10;

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
 * Order-independent: the crawl listing documents no order (https://docs.browserless.io/rest-apis/crawl),
 * so a check walks `nextCursor` up to `MAX_PAGES` pages, sorts what it found by `createdAt`, and
 * de-duplicates on the crawl id. The vendor's response array is `crawls`.
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
    url: "https://www.browserless.io",
    status: "in-progress",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    return await pollNewItems<Crawl>({
      state,
      maxPages: 1,
      maxEvents: 500,
      seenWindow: 1500,
      idOf: (c) => String(c.id),
      async fetchPage() {
        const all: Crawl[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < MAX_PAGES; page++) {
          const res = await crawlList.execute({ limit: PAGE_SIZE, cursor }, ctx) as {
            data?: CrawlPage;
          };
          all.push(...(res.data?.crawls ?? res.data?.data ?? []));
          cursor = res.data?.nextCursor || undefined;
          if (!cursor) return { items: sortNewestFirst(all) };
        }
        ctx.log("warn", `new-crawl: more than ${MAX_PAGES} pages of crawls; the rest are skipped`);
        return { items: sortNewestFirst(all) };
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

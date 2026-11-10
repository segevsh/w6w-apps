import contentList from "../actions/content-list.ts";
import { sinceTrigger, stampMs } from "../lib/triggers.ts";

/**
 * `GET /contents?from=<since>` — `from`/`to` are documented ("starting date and time for the filter
 * range") without naming the field and without a sort order, so this is the since-filter shape: the
 * window is re-read from `cursor - 120 s`, a record stamped (`created_at`) before the first check is
 * never emitted, and ids dedupe (https://uscreen.io/api/publisher.yml, verified 2026-11-10).
 */
export default sinceTrigger({
  key: "new-content",
  title: "New Content",
  description: "The run gets each new video, collection or live event.",
  output: [
    { key: "id", type: "number", label: "Content ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "created_at", type: "number", label: "Created at (unix seconds)" },
  ],
  sample: {
    id: 201,
    title: "Welcome video",
    content_type: "video",
    created_at: 1794182400,
  },
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  createdMs: (item) => stampMs((item as { created_at?: unknown }).created_at),
  async fetchPage(since, page, ctx) {
    const out = await contentList.execute({ from: since, page }, ctx) as {
      items?: unknown[];
      hasMore?: boolean;
      nextPage?: number | null;
    };
    return {
      items: out.items ?? [],
      next: out.hasMore && typeof out.nextPage === "number" ? out.nextPage : undefined,
    };
  },
});

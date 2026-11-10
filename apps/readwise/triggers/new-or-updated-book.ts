import { walkTrigger } from "../lib/walk.ts";
import bookList from "../actions/book-list.ts";

const PAGE = 100;
type Book = { id?: unknown; updated?: unknown };

/**
 * Readwise's List Books documents `updated__gt` ("filter by last updated datetime (greater than)"),
 * https://readwise.io/api_deets, and no order or creation filter: the since-filter shape. A check
 * asks `updated__gt = last check − 2 min`, follows `next` over `page` (a longer window is drained
 * over successive checks, the cursor moving only once it is drained), drops books whose `updated`
 * stamp is before the first check (nothing that existed at the seed is ever emitted), and dedupes
 * on `id:updated`, so an edit is a new event.
 */
export default walkTrigger({
  key: "new-or-updated-book",
  title: "New or Updated Book",
  description:
    "The run gets each book, article, tweet or podcast that is new or was updated (e.g. new highlights) since the last check.",
  action: bookList as never,
  first: ({ sinceMs }) => ({
    updated__gt: new Date(sinceMs).toISOString(),
    page_size: PAGE,
    page: 1,
  }),
  next: (req, result) =>
    (result as { next?: string | null }).next ? { ...req, page: Number(req.page) + 1 } : undefined,
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => `${(item as Book).id}:${(item as Book).updated}`,
  stampOf: (item) => {
    const t = Date.parse(String((item as Book).updated ?? ""));
    return Number.isFinite(t) ? t : undefined;
  },
  output: [{ key: "id", type: "number", label: "Book ID" }, {
    key: "title",
    type: "string",
    label: "Title",
  }, { key: "updated", type: "string", label: "Updated at" }],
  sample: { id: 1, title: "Book", updated: "2026-11-09T10:00:00Z" },
});

import { pollFromListAction } from "../../_shared/poll/mod.ts";
import articleList from "../actions/article-list.ts";
import { idOf, rows } from "../lib/triggers.ts";

/**
 * Wraps `article-list` with `order_by=id_desc` — the documented `order_by` enum for
 * GET /2.0/article takes an `_desc` suffix (https://docs.bexio.com, verified 2026-11-10).
 */
export default pollFromListAction({
  key: "new-article",
  title: "New Article",
  description:
    "The run gets each newly created article (item / product), sorted by ID, newest first.",
  action: articleList,
  input: () => ({ orderBy: "id", descending: true, limit: 100, offset: 0 }),
  items: rows,
  idOf: idOf,
  output: [
    { key: "id", type: "number", label: "Article ID" },
    { key: "intern_name", type: "string", label: "Internal name" },
  ],
  sample: { id: 101, intern_name: "Sample article" },
  maxPages: 1,
});

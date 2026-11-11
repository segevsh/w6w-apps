import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import blogFollowingList from "../actions/blog-following-list.ts";

/**
 * `GET /v2/blog/{blog-identifier}/following`: documented "in order from most recently-followed to
 * first" (https://www.tumblr.com/docs/en/api/v2, verified 2026-11-10), so page 1 is the newest.
 */
export default pollFromListAction<{ blogIdentifier: string }>({
  key: "new-blog-following",
  title: "New Followed Blog",
  description: "The run gets each blog the chosen blog newly follows.",
  action: blogFollowingList as unknown as ActionDefinition,
  input: (params) => ({ blogIdentifier: params.blogIdentifier, limit: 20, offset: 0 }),
  items: (result) => (result as { blogs?: unknown[] }).blogs ?? [],
  idOf: (item) => String((item as { name?: string }).name ?? ""),
  params: [{ key: "blogIdentifier", type: "string", label: "Blog identifier", required: true }],
  output: [
    { key: "name", type: "string", label: "Blog name" },
    { key: "url", type: "string", label: "Blog URL" },
    { key: "title", type: "string", label: "Title" },
    { key: "updated", type: "number", label: "Last post (epoch seconds)" },
  ],
  sample: {
    name: "david",
    url: "davidslog.example",
    title: "David's Log",
    updated: 1308781073,
  },
  maxPages: 1,
});

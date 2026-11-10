import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import blogPostsDraftList from "../actions/blog-posts-draft-list.ts";

/**
 * `GET /v2/blog/{blog-identifier}/posts/draft`: the vendor describes `before_id` as "posts that have
 * appeared before this ID ... get a set of posts, and then get posts since the last ID of the previous
 * set", so a page runs from higher to lower ids and the first page (no `before_id`) holds the newest
 * drafts (https://www.tumblr.com/docs/en/api/v2, verified 2026-11-10).
 */
export default pollFromListAction<{ blogIdentifier: string }>({
  key: "new-draft-post",
  title: "New Draft Post",
  description: "The run gets each draft post newly saved on the blog.",
  action: blogPostsDraftList as unknown as ActionDefinition,
  input: (params) => ({ blogIdentifier: params.blogIdentifier }),
  items: (result) => (result as { posts?: unknown[] }).posts ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  params: [{ key: "blogIdentifier", type: "string", label: "Blog identifier", required: true }],
  output: [
    { key: "id", type: "number", label: "Post ID" },
    { key: "blog_name", type: "string", label: "Blog name" },
    { key: "state", type: "string", label: "State" },
    { key: "summary", type: "string", label: "Summary" },
  ],
  sample: { id: 123, blog_name: "example", state: "draft", summary: "Work in progress" },
  maxPages: 1,
});

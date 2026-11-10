import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import blogPostsList from "../actions/blog-posts-list.ts";

export default pollFromListAction<{ blogIdentifier: string }>({
  key: "new-post",
  title: "New Post",
  description: "Polls the newest published Tumblr posts from blog-posts-list.",
  action: blogPostsList as unknown as ActionDefinition,
  input: (params) => ({
    blogIdentifier: params.blogIdentifier,
    sort: "desc",
    limit: 20,
    offset: 0,
  }),
  items: (result) => (result as { posts?: unknown[] }).posts ?? [],
  idOf: (item) => String((item as { id: string | number }).id),
  params: [{ key: "blogIdentifier", type: "string", label: "Blog identifier", required: true }],
  output: [{ key: "id", type: "number", label: "Post ID" }],
  sample: { id: 123, blog_name: "example", summary: "Hello" },
  maxPages: 1,
});

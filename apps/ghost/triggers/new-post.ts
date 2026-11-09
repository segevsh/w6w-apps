import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listPosts from "../actions/list-posts.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description: "Fires when Ghost has a newly published post.",
  action: listPosts,
  input: () => ({ order: "published_at desc", limit: 100, page: 1 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "published_at", type: "string", label: "Published At" },
  ],
  sample: { id: "post_123", title: "A new post", published_at: "2026-11-09T00:00:00.000Z" },
});

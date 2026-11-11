import { tumblrOffsetSnapshot } from "../lib/triggers.ts";
import blogPostsQueueList from "../actions/blog-posts-queue-list.ts";

/**
 * `GET /v2/blog/{blog-identifier}/posts/queue` (`limit` 1-20, `offset`): a blog holds at most 1 000
 * queued posts, so each check reads the whole queue and emits ids not seen before
 * (https://www.tumblr.com/docs/en/api/v2, verified 2026-11-10).
 */
export default tumblrOffsetSnapshot({
  key: "new-queued-post",
  title: "New Queued Post",
  description: "The run gets each post newly added to the blog's queue.",
  action: blogPostsQueueList as never,
  params: [{ key: "blogIdentifier", type: "string", label: "Blog identifier", required: true }],
  itemsKey: "posts",
  limit: true,
  output: [
    { key: "id", type: "number", label: "Post ID" },
    { key: "blog_name", type: "string", label: "Blog name" },
    { key: "state", type: "string", label: "State" },
    { key: "summary", type: "string", label: "Summary" },
  ],
  sample: { id: 124, blog_name: "example", state: "queued", summary: "Coming up" },
});

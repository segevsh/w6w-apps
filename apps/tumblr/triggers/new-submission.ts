import { tumblrOffsetSnapshot } from "../lib/triggers.ts";
import blogPostsSubmissionList from "../actions/blog-posts-submission-list.ts";

/**
 * `GET /v2/blog/{blog-identifier}/posts/submission` (`offset`, no `limit`): submissions awaiting the
 * blog owner's review are a small inbox, so each check reads it page by page until an empty page and
 * emits ids not seen before (https://www.tumblr.com/docs/en/api/v2, verified 2026-11-10).
 */
export default tumblrOffsetSnapshot({
  key: "new-submission",
  title: "New Submission",
  description: "The run gets each post newly submitted to the blog for review.",
  action: blogPostsSubmissionList as never,
  params: [{ key: "blogIdentifier", type: "string", label: "Blog identifier", required: true }],
  itemsKey: "posts",
  limit: false,
  output: [
    { key: "id", type: "number", label: "Submission post ID" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "type", type: "string", label: "Post type" },
    { key: "timestamp", type: "number", label: "Epoch seconds" },
  ],
  sample: {
    id: 125,
    slug: "my-question",
    type: "text",
    timestamp: 1308781073,
  },
});

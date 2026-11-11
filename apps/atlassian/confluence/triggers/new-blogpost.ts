import blogpostList from "../actions/blogpost-list.ts";
import { newestFirst } from "../lib/triggers.ts";

/**
 * Wraps `blogpost-list` with `sort=-created-date` (GET /wiki/api/v2/blogposts documents the
 * `sort` enum `id`, `created-date`, `modified-date`, each with a `-` descending form;
 * https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/, verified 2026-11-10).
 */
export default newestFirst({
  key: "new-blogpost",
  title: "New Blog Post",
  description: "The run gets each newly created blog post.",
  action: blogpostList,
  sort: "-created-date",
  output: [
    { key: "id", type: "string", label: "Blog post ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "spaceId", type: "string", label: "Space ID" },
    { key: "authorId", type: "string", label: "Author account ID" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "blog-101",
    title: "Release notes",
    spaceId: "65540",
    authorId: "sample-account-id",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
});

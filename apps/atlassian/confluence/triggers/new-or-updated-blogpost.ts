import blogpostList from "../actions/blogpost-list.ts";
import { idAndVersion, newestFirst } from "../lib/triggers.ts";

/**
 * Wraps `blogpost-list` with `sort=-modified-date` (documented `sort` enum of
 * GET /wiki/api/v2/blogposts; https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-blog-post/,
 * verified 2026-11-10). Each edit bumps `version.number`, so `id:version` makes an edit a new event.
 */
export default newestFirst({
  key: "new-or-updated-blogpost",
  title: "New or Updated Blog Post",
  description: "The run gets each blog post created or modified since the last successful check.",
  action: blogpostList,
  sort: "-modified-date",
  idOf: idAndVersion,
  output: [
    { key: "id", type: "string", label: "Blog post ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "version", type: "object", label: "Blog post version" },
  ],
  sample: { id: "blog-101", title: "Release notes", version: { number: 2 } },
});

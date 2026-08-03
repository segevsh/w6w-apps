import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

/**
 * `GET /search.json` — full-text search across topics, posts, users and
 * categories.
 *
 * ## The query string IS the filter language
 *
 * Discourse takes exactly two parameters here: `q` and `page`. Everything a
 * caller might expect to be a separate filter is instead a prefix inside `q`,
 * and the reference publishes the whole grammar:
 *
 *     @username           posts by a user
 *     #category-slug      within a category
 *     tags:api,solved     any of these tags   (tags:api+solved for all of them)
 *     before:yyyy-mm-dd   after:yyyy-mm-dd
 *     order:latest        also likes, views, latest_topic
 *     in:title            also likes, personal, messages, seen, unseen, posted,
 *                         created, watching, tracking, bookmarks, assigned,
 *                         unassigned, first, pinned, wiki
 *     with:images
 *     status:open         also closed, public, archived, noreplies,
 *                         single_user, solved, unsolved
 *     group:name          group_messages:name
 *     min_posts: / max_posts: / min_views: / max_views:
 *
 * So this action offers one text field and documents the grammar in its hint,
 * rather than inventing a dozen params that would have to be reassembled into
 * the same string anyway — and that would drift the moment Discourse adds a
 * prefix. The full vocabulary is reproduced above so it is readable without
 * leaving the file.
 *
 * URL encoding is handled by `lib/client.ts`, which builds the query through
 * `URLSearchParams`. The reference's own advice is to use curl's
 * `--data-urlencode`; the equivalent here is simply not to concatenate.
 */
interface Input {
  q: string;
  page?: number;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search",
  description: "Full-text search across topics, posts, users and categories.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "onboarding #howto tags:api after:2026-01-01",
      hint:
        "Discourse's search grammar goes in here: `@user`, `#category`, `tags:a,b` (`a+b` for " +
        "all), `before:`/`after:` yyyy-mm-dd, `order:latest|likes|views|latest_topic`, " +
        "`in:title|personal|messages|bookmarks|…`, `with:images`, " +
        "`status:open|closed|solved|…`, `group:`, `min_posts:`/`max_posts:`, " +
        "`min_views:`/`max_views:`.",
    },
    pageParam,
  ],
  output: [
    { key: "posts", type: "array", label: "Matching posts" },
    { key: "topics", type: "array", label: "Matching topics" },
    { key: "users", type: "array", label: "Matching users" },
    { key: "categories", type: "array", label: "Matching categories" },
    { key: "tags", type: "array", label: "Matching tags" },
    { key: "groups", type: "array", label: "Matching groups" },
    { key: "grouped_search_result", type: "object", label: "Search result metadata" },
  ],

  execute(input, ctx) {
    return new DiscourseClient(ctx).request("/search.json", {
      query: { q: input.q, page: input.page },
    });
  },
};

export default search;

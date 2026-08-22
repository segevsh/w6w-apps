import type { ActionDefinition } from "@w6w/types";
import { BlueskyClient, query } from "../lib/client.ts";
import { CURSOR_PARAM, limitParam } from "../lib/params.ts";

/**
 * `app.bsky.feed.searchPosts` — full-text search across the network.
 *
 * ## This one is not public, and it fails in an unusual way
 *
 * Probed live on 2026-08-18: the same call to `public.api.bsky.app` without a
 * token returns **403 with an HTML page from an edge proxy** — not a JSON XRPC
 * error, not a 401. Anything parsing the response as JSON gets a syntax error
 * about `<`, which points nowhere near the cause. This app always calls the
 * authenticated PDS, and the client names a non-JSON body for what it is.
 *
 * ## The index is not the firehose
 *
 * Search is a separate service with its own ingestion lag and its own idea of
 * what is worth indexing. A post that exists and is visible in a thread may not
 * be findable here for some minutes, and very old posts may not be findable at
 * all. Absence from search is not evidence of absence from the network.
 */
const action: ActionDefinition = {
  key: "post-search",
  type: "search",
  resource: "post",
  title: "Search posts",
  description:
    "Full-text search across Bluesky. Requires a session — unauthenticated this endpoint answers " +
    "with an HTML 403 from an edge proxy rather than a JSON error.",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      default: "",
      hint: "Supports `from:handle`, `since:`/`until:` dates, and quoted phrases.",
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      default: "latest",
      options: [
        { value: "latest", label: "Latest" },
        { value: "top", label: "Top" },
      ],
    },
    {
      key: "author",
      label: "From",
      type: "string",
      default: "",
      hint: "A handle or DID. The same as `from:` in the query.",
    },
    { key: "since", label: "Since", type: "string", default: "", hint: "ISO date or datetime." },
    { key: "until", label: "Until", type: "string", default: "", hint: "ISO date or datetime." },
    {
      key: "lang",
      label: "Language",
      type: "string",
      default: "",
      advanced: true,
      hint: "BCP-47. Filters on the posts' declared language, which posters set — not detected.",
    },
    {
      key: "tag",
      label: "Tags",
      type: "string",
      default: "",
      advanced: true,
      hint: "Comma-separated hashtags, without the `#`.",
    },
    limitParam(25),
    CURSOR_PARAM,
  ],
  output: [
    { key: "posts", type: "array", label: "Matching posts" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "cursor", type: "string", label: "Pass back for the next page; absent at the end" },
    { key: "hitsTotal", type: "number", label: "Total matches, when the index reports one" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const q = String(p.q ?? "").trim();
    if (!q) throw new Error("`q` is required");

    const result = await new BlueskyClient(ctx).call<{
      posts?: unknown[];
      cursor?: string;
      hitsTotal?: number;
    }>("app.bsky.feed.searchPosts", {
      query: query({
        q,
        sort: p.sort,
        author: String(p.author ?? "").trim().replace(/^@/, ""),
        since: p.since,
        until: p.until,
        lang: p.lang,
        tag: p.tag,
        limit: Math.min(100, Math.max(1, Number(p.limit ?? 25))),
        cursor: p.cursor,
      }),
    });

    const posts = result?.posts ?? [];
    ctx.log("info", "searched Bluesky posts", { count: posts.length });
    return { posts, count: posts.length, cursor: result?.cursor, hitsTotal: result?.hitsTotal };
  },
};

export default action;

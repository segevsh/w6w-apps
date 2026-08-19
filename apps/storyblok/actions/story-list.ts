import type { ActionDefinition } from "@w6w/types";
import {
  assertCredential,
  csv,
  query,
  rateLimitFor,
  StoryblokClient,
  throughputFor,
} from "../lib/client.ts";

/**
 * `GET /v2/cdn/stories` — content entries, filtered.
 *
 * ## A bigger page is slower, and the arithmetic is Storyblok's own
 *
 * The delivery rate limit falls as the page size rises: 50 requests a second
 * for pages of 25 or fewer, and **6 a second** for pages of 76 to 100. So:
 *
 * - 25 per page × 50/s = **1,250 entries a second**
 * - 100 per page × 6/s = **600 entries a second**
 *
 * Asking for four times as much per request halves the throughput. Everybody's
 * instinct is to raise `per_page` to drain a list faster, and it does the
 * opposite. This action defaults to 25 and reports the limit it is working
 * under, so the number is visible rather than folded into an eventual 429.
 *
 * ## `starts_with` is how you scope to a folder, and it is a prefix
 *
 * `blog/` returns everything under blog. Without the trailing slash, `blog`
 * also matches `blogroll` — a prefix match dressed as a folder filter.
 *
 * ## Filtering happens on published fields, in the published version
 *
 * `filter_query` runs against the version being requested. A filter on a field
 * somebody has only changed in draft matches nothing in `published`, which
 * reads as the filter being wrong.
 */
const action: ActionDefinition = {
  key: "story-list",
  type: "search",
  resource: "story",
  title: "List stories",
  description:
    "Content entries through the delivery API. Note a BIGGER PAGE IS SLOWER: Storyblok's rate " +
    "limit falls from 50 requests a second at 25 per page to 6 at 100, so 25 per page moves " +
    "twice the content. Defaults to 25 and reports the limit it is under.",
  params: [
    {
      key: "startsWith",
      label: "Path prefix",
      type: "string",
      default: "",
      placeholder: "blog/",
      hint: "A PREFIX, not a folder — `blog` also matches `blogroll`, so include the slash.",
    },
    {
      key: "contentType",
      label: "Content type",
      type: "string",
      default: "",
      placeholder: "article",
      hint: "The component name of the story's root block.",
    },
    {
      key: "version",
      label: "Version",
      type: "select",
      default: "published",
      options: [
        { value: "published", label: "Published" },
        { value: "draft", label: "Draft — needs a preview token" },
      ],
    },
    {
      key: "search",
      label: "Search term",
      type: "string",
      default: "",
      hint: "Full-text across the story's content.",
    },
    {
      key: "byUuids",
      label: "By UUIDs",
      type: "string",
      default: "",
      hint: "Comma-separated. The way to resolve a list of references in one request.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      default: "",
      placeholder: "content.date:desc",
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 25,
      hint: "Above 25 the rate limit drops sharply — 100 per page is 6 requests a second, which " +
        "moves LESS content per second than 25 per page at 50.",
    },
    { key: "page", label: "Page", type: "number", default: 1 },
    {
      key: "resolveRelations",
      label: "Resolve relations",
      type: "string",
      default: "",
      advanced: true,
    },
    {
      key: "cacheVersion",
      label: "Cache version",
      type: "number",
      default: 0,
      advanced: true,
      hint: "From `space-get`. With it these requests are served from the CDN at 1000/s.",
    },
  ],
  output: [
    { key: "stories", type: "array", label: "The stories" },
    { key: "count", type: "number", label: "How many came back" },
    { key: "total", type: "number", label: "How many match in all" },
    { key: "slugs", type: "array", label: "Their paths" },
    { key: "uuids", type: "array", label: "Their stable ids" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
    { key: "rateLimitPerSecond", type: "number", label: "What this page size costs" },
    { key: "entriesPerSecond", type: "number", label: "Throughput at this page size" },
    { key: "cv", type: "number", label: "Pass this to the next call" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "delivery");

    const perPage = Math.max(1, Math.min(100, Number(p.perPage ?? 25)));
    const page = Math.max(1, Number(p.page ?? 1));

    // Storyblok's own table: the limit falls as the page grows.
    const limit = rateLimitFor(perPage);
    if (perPage > 25) {
      ctx.log(
        "info",
        `a page of ${perPage} entries is rate limited to ${limit} requests a second, against 50 ` +
          `for pages of 25 — ${throughputFor(perPage)} entries a second against ` +
          `${throughputFor(25)}. Smaller pages move more content`,
        { perPage },
      );
    }

    const result = await new StoryblokClient(ctx).delivery<{
      stories?: Array<{
        id?: number;
        uuid?: string;
        full_slug?: string;
        name?: string;
        published_at?: string | null;
        content?: Record<string, unknown>;
      }>;
      cv?: number;
    }>("/stories", {
      query: query({
        starts_with: String(p.startsWith ?? "").trim(),
        content_type: String(p.contentType ?? "").trim(),
        version: String(p.version ?? "published"),
        search_term: String(p.search ?? "").trim(),
        by_uuids: csv(p.byUuids)?.join(","),
        sort_by: String(p.sortBy ?? "").trim(),
        resolve_relations: csv(p.resolveRelations)?.join(","),
        per_page: perPage,
        page,
        cv: Number(p.cacheVersion ?? 0) || undefined,
      }),
    });

    const stories = result.data?.stories ?? [];
    const total = result.total;

    // Counts and paths. The content is the customer's.
    ctx.log("info", "listed Storyblok stories", { count: stories.length, total });

    return {
      stories,
      count: stories.length,
      total,
      slugs: stories.map((story) => story?.full_slug).filter(Boolean),
      uuids: stories.map((story) => story?.uuid).filter(Boolean),
      // A page past the last returns an empty array rather than an error.
      hasMore: total !== undefined ? page * perPage < total : stories.length === perPage,
      rateLimitPerSecond: limit,
      entriesPerSecond: throughputFor(perPage),
      cv: result.cv,
    };
  },
};

export default action;

import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/story-list.ts";

const D = { display: { credentialKind: "delivery", region: "eu" } };
const stories = (n: number) => ({
  status: 200,
  body: {
    stories: Array.from({ length: n }, (_, i) => ({
      id: i,
      uuid: `u${i}`,
      full_slug: `blog/post-${i}`,
    })),
    cv: 1735645795,
  },
  headers: { total: "412", "per-page": String(n) },
});

Deno.test("story-list: defaults to 25 per page and reports the limit", async () => {
  const { ctx, calls } = mockCtx([stories(25)], D);
  const result = await action.execute({ startsWith: "blog/" }, ctx) as Record<string, unknown>;
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("per_page"), "25");
  assertEquals(q.get("starts_with"), "blog/");
  assertEquals(result.rateLimitPerSecond, 50);
  assertEquals(result.entriesPerSecond, 1250);
});

/**
 * The insight everybody gets backwards: raising the page size lowers the rate
 * limit faster than it raises the payload.
 */
Deno.test("story-list: a big page is flagged as slower, with the arithmetic", async () => {
  const { ctx, logs } = mockCtx([stories(100)], D);
  const result = await action.execute({ perPage: 100 }, ctx) as Record<string, unknown>;
  assertEquals(result.rateLimitPerSecond, 6);
  assertEquals(result.entriesPerSecond, 600);
  assert(
    logs.some((l) => /Smaller pages move more content/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("story-list: 25 or fewer per page says nothing", async () => {
  const { ctx, logs } = mockCtx([stories(25)], D);
  await action.execute({ perPage: 25 }, ctx);
  assert(!logs.some((l) => /Smaller pages/.test(l.message)), JSON.stringify(logs));
});

Deno.test("story-list: reads the total from the headers and computes hasMore", async () => {
  const { ctx } = mockCtx([stories(25)], D);
  const result = await action.execute({ page: 1 }, ctx) as Record<string, unknown>;
  assertEquals(result.total, 412);
  assertEquals(result.hasMore, true);

  const last = mockCtx([{ ...stories(25), headers: { total: "25" } }], D);
  const done = await action.execute({ page: 1 }, last.ctx) as Record<string, unknown>;
  assertEquals(done.hasMore, false);
});

Deno.test("story-list: every filter reaches the query with Storyblok's names", async () => {
  const { ctx, calls } = mockCtx([stories(1)], D);
  await action.execute({
    contentType: "article",
    version: "draft",
    search: "boots",
    byUuids: "a, b",
    sortBy: "content.date:desc",
    cacheVersion: 99,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("content_type"), "article");
  assertEquals(q.get("version"), "draft");
  assertEquals(q.get("search_term"), "boots");
  assertEquals(q.get("by_uuids"), "a,b");
  assertEquals(q.get("sort_by"), "content.date:desc");
  assertEquals(q.get("cv"), "99");
});

/** The content is the customer's. */
Deno.test("story-list: logs counts, never the stories", async () => {
  const { ctx, logs } = mockCtx([{
    status: 200,
    body: { stories: [{ full_slug: "x", content: { secret: "hunter2" } }] },
  }], D);
  await action.execute({}, ctx);
  const data = JSON.stringify(logs);
  assert(!/hunter2/.test(data), data);
});

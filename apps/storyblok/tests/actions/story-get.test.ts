import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/story-get.ts";

const D = { display: { credentialKind: "delivery", region: "eu" } };
const M = { display: { credentialKind: "management", region: "eu", spaceId: "1" } };
const story = {
  status: 200,
  body: {
    story: {
      id: 42,
      uuid: "abc-123",
      slug: "my-post",
      full_slug: "blog/my-post",
      name: "My post",
      published_at: "2026-08-01T00:00:00Z",
      content: { component: "article", title: "My post" },
    },
    cv: 1735645795,
  },
};

Deno.test("story-get: fetches by slug and returns the cache version", async () => {
  const { ctx, calls } = mockCtx([story], D);
  const result = await action.execute({ slug: "blog/my-post" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v2/cdn/stories/blog/my-post");
  assertEquals(new URL(calls[0].url).searchParams.get("version"), "published");
  assertEquals(result.uuid, "abc-123");
  assertEquals(result.componentType, "article");
  assertEquals(result.cv, 1735645795, "the number that makes the next call cheap");
});

Deno.test("story-get: relations, language and cv reach the query", async () => {
  const { ctx, calls } = mockCtx([story], D);
  await action.execute({
    slug: "blog/my-post",
    resolveRelations: "article.author, article.related",
    language: "de",
    cacheVersion: 1735645795,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("resolve_relations"), "article.author,article.related");
  assertEquals(q.get("language"), "de");
  assertEquals(q.get("cv"), "1735645795");
});

/** Draft and published are separate documents. */
Deno.test("story-get: asking for a draft says it differs from the site", async () => {
  const { ctx, logs } = mockCtx([story], D);
  await action.execute({ slug: "blog/my-post", version: "draft" }, ctx);
  assert(
    logs.some((l) => /differs from what the site serves/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Storyblok's own error would be a bare Unauthorized. */
Deno.test("story-get: refuses a management connection before requesting", async () => {
  const { ctx, calls } = mockCtx([], M);
  const err = await assertRejects(
    async () => await action.execute({ slug: "home" }, ctx),
    Error,
  );
  assert(/CONTENT DELIVERY API/.test(err.message), err.message);
  assert(/story-search/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("story-get: a leading slash is trimmed rather than doubling the path", async () => {
  const { ctx, calls } = mockCtx([story], D);
  await action.execute({ slug: "/blog/my-post" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/cdn/stories/blog/my-post");
});

Deno.test("story-get: requires a slug", async () => {
  const { ctx } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`slug` is required");
});

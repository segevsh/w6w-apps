import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/story-search.ts";

const M = { display: { credentialKind: "management", region: "eu", spaceId: "123" } };
const D = { display: { credentialKind: "delivery", region: "eu" } };
const stories = {
  status: 200,
  body: {
    stories: [
      {
        id: 1,
        full_slug: "blog/live",
        published: true,
        unpublished_changes: true,
        published_at: "2026-08-01T00:00:00Z",
      },
      { id: 2, full_slug: "blog/clean", published: true, published_at: "2026-08-01T00:00:00Z" },
      { id: 3, full_slug: "blog/never", published: false, published_at: null },
      { id: 4, full_slug: "blog", is_folder: true },
    ],
  },
  headers: { total: "4" },
};

/** The question the delivery API cannot answer. */
Deno.test("story-search: names the stories that are live and edited since", async () => {
  const { ctx, calls } = mockCtx([stories], M);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/123/stories");
  assertEquals(result.withUnpublishedChanges, ["blog/live"]);
  assertEquals(result.neverPublished, ["blog/never"]);
  assertEquals(result.folders, ["blog"]);
});

Deno.test("story-search: the state filter maps onto is_published", async () => {
  const published = mockCtx([stories], M);
  await action.execute({ state: "published" }, published.ctx);
  assertEquals(new URL(published.calls[0].url).searchParams.get("is_published"), "true");

  const unpublished = mockCtx([stories], M);
  await action.execute({ state: "unpublished" }, unpublished.ctx);
  assertEquals(new URL(unpublished.calls[0].url).searchParams.get("is_published"), "false");

  const all = mockCtx([stories], M);
  await action.execute({}, all.ctx);
  assertEquals(new URL(all.calls[0].url).searchParams.get("is_published"), null);
});

Deno.test("story-search: search, prefix and content type reach the query", async () => {
  const { ctx, calls } = mockCtx([stories], M);
  await action.execute({ search: "boots", startsWith: "blog/", contentType: "article" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("search"), "boots");
  assertEquals(q.get("starts_with"), "blog/");
  assertEquals(q.get("contain_component"), "article");
});

Deno.test("story-search: refuses a delivery connection", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(async () => await action.execute({}, ctx), Error);
  assert(/MANAGEMENT connection/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** It is also the slow one. */
Deno.test("story-search: says the Management API is 3 to 6 requests a second", () => {
  assert(/3 to 6 requests a second/.test(action.description!), action.description);
});

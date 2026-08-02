import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-post.ts";

Deno.test("create-post: POSTs /{pageId}/feed with message/link/published as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "post-1" } }]);
  const result = await action.execute!(
    { pageId: "page-1", message: "hello", link: "https://example.com" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/page-1/feed");
  assertEquals(url.searchParams.get("message"), "hello");
  assertEquals(url.searchParams.get("link"), "https://example.com");
  assertEquals(url.searchParams.get("published"), "true");
  assertEquals(result, { id: "post-1" });
});

Deno.test("create-post: defaults published to true", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "post-1" } }]);
  await action.execute!({ pageId: "page-1", message: "hi" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("published"), "true");
});

Deno.test("create-post: honours published=false", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "post-1" } }]);
  await action.execute!({ pageId: "page-1", message: "hi", published: false }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("published"), "false");
});

Deno.test("create-post: throws when neither message nor link is given, without a network call", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(() => action.execute!({ pageId: "page-1" }, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("create-post: omits authorization (runtime injects it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "post-1" } }]);
  await action.execute!({ pageId: "page-1", message: "hi" }, ctx);
  assert(!("authorization" in calls[0].headers));
});

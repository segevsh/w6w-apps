import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/post-search.ts";

const hits = ok({ posts: [{ uri: "at://a/app.bsky.feed.post/1" }], cursor: "c1", hitsTotal: 42 });

Deno.test("post-search: goes to the authenticated PDS, not the public AppView", async () => {
  const { ctx, calls } = mockCtx([hits], { display });
  const result = await action.execute!({ q: "deno" }, ctx) as { count: number; hitsTotal: number };
  assert(
    calls[0].url.startsWith("https://bsky.social/xrpc/app.bsky.feed.searchPosts"),
    calls[0].url,
  );
  assert(!calls[0].url.includes("public.api.bsky.app"), calls[0].url);
  assertEquals(result.count, 1);
  assertEquals(result.hitsTotal, 42);
});

Deno.test("post-search: filters reach the wire, and empties are dropped", async () => {
  const { ctx, calls } = mockCtx([hits], { display });
  await action.execute!({
    q: "deno",
    author: "@alice.bsky.social",
    since: "2026-01-01",
    sort: "top",
    lang: "",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("author"), "alice.bsky.social", "the @ is stripped");
  assertEquals(url.searchParams.get("since"), "2026-01-01");
  assertEquals(url.searchParams.get("sort"), "top");
  assertEquals(url.searchParams.has("lang"), false);
});

/**
 * Unauthenticated this endpoint answers with an HTML 403 from an edge proxy.
 * The client has to name that rather than throw a JSON parse error.
 */
Deno.test("post-search: an HTML 403 is explained as an edge proxy", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "<html><title>403 Forbidden</title></html>" }], {
    display,
  });
  const error = await assertRejects(async () => await action.execute!({ q: "deno" }, ctx), Error);
  assert(/non-JSON body/.test(error.message), error.message);
  assert(/edge proxy/.test(error.message), error.message);
});

Deno.test("post-search: the limit is clamped to Bluesky's ceiling", async () => {
  const { ctx, calls } = mockCtx([hits], { display });
  await action.execute!({ q: "deno", limit: 500 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
});

Deno.test("post-search: the cursor is passed through for the next page", async () => {
  const { ctx, calls } = mockCtx([hits], { display });
  const result = await action.execute!({ q: "deno", cursor: "c0" }, ctx) as { cursor: string };
  assertEquals(new URL(calls[0].url).searchParams.get("cursor"), "c0");
  assertEquals(result.cursor, "c1");
});

Deno.test("post-search: needs a query", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`q` is required");
  assertEquals(calls.length, 0);
});

/** Search is a separate index with its own lag. */
Deno.test("post-search: logs a count, never the query or results", async () => {
  const { ctx, logs } = mockCtx([hits], { display });
  await action.execute!({ q: "something private" }, ctx);
  assert(!JSON.stringify(logs).includes("private"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok, POST_URI } from "./_shared.ts";
import action, { walk } from "../../actions/thread-get.ts";

const tree = ok({
  thread: {
    $type: "app.bsky.feed.defs#threadViewPost",
    post: { uri: POST_URI, record: { text: "root" } },
    replies: [
      { $type: "app.bsky.feed.defs#threadViewPost", post: { uri: "at://a/app.bsky.feed.post/2" } },
      { $type: "app.bsky.feed.defs#blockedPost", uri: "at://b/app.bsky.feed.post/3" },
      { $type: "app.bsky.feed.defs#notFoundPost", uri: "at://c/app.bsky.feed.post/4" },
    ],
  },
});

/**
 * The response is a recursive union and two of its arms have no `post` field at
 * all — so a naive walk throws on a thread containing a blocked account, which
 * is common.
 */
Deno.test("thread-get: blocked and missing nodes are counted, not crashed on", async () => {
  const { ctx } = mockCtx([tree], { display });
  const result = await action.execute!({ uri: POST_URI }, ctx) as {
    count: number;
    blocked: number;
    notFound: number;
  };
  assertEquals(result.count, 2);
  assertEquals(result.blocked, 1);
  assertEquals(result.notFound, 1);
});

Deno.test("thread-get: walks ancestors as well as replies", () => {
  const walked = walk({
    $type: "app.bsky.feed.defs#threadViewPost",
    post: { uri: "child" },
    parent: { $type: "app.bsky.feed.defs#threadViewPost", post: { uri: "parent" } },
  });
  assertEquals(walked.posts.length, 2);
});

Deno.test("thread-get: an empty or absent tree walks to nothing", () => {
  assertEquals(walk(undefined), { posts: [], blocked: 0, notFound: 0 });
});

/** depth goes down into replies; parentHeight goes up toward the root. */
Deno.test("thread-get: the two directions are sent as separate parameters", async () => {
  const { ctx, calls } = mockCtx([tree], { display });
  await action.execute!({ uri: POST_URI, depth: 2, parentHeight: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("depth"), "2");
  assertEquals(url.searchParams.get("parentHeight"), "10");
  assertEquals(url.searchParams.get("uri"), POST_URI);
});

Deno.test("thread-get: a web link is converted", async () => {
  const { ctx, calls } = mockCtx([tree], { display });
  await action.execute!({ uri: "https://bsky.app/profile/a.bsky.social/post/3k2a" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("uri"),
    "at://a.bsky.social/app.bsky.feed.post/3k2a",
  );
});

Deno.test("thread-get: needs a post", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`uri` is required");
});

Deno.test("thread-get: logs the shape, never the posts", async () => {
  const { ctx, logs } = mockCtx([tree], { display });
  await action.execute!({ uri: POST_URI }, ctx);
  assert(!JSON.stringify(logs).includes("root"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 2, blocked: 1, notFound: 1 });
});

import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok, POST_URI } from "./_shared.ts";
import action from "../../actions/post-get.ts";

const OTHER = "at://did:plc:author/app.bsky.feed.post/3k2b";

/**
 * Deleted and blocked posts are absent rather than null, so reading `posts[i]`
 * positionally pairs the wrong post with the wrong URI.
 */
Deno.test("post-get: reports which URIs did not come back", async () => {
  const { ctx, calls } = mockCtx([ok({ posts: [{ uri: POST_URI, cid: "c" }] })], { display });
  const result = await action.execute!({ uris: `${POST_URI},${OTHER}` }, ctx) as {
    count: number;
    missing: string[];
  };
  assertEquals(new URL(calls[0].url).searchParams.get("uris"), `${POST_URI},${OTHER}`);
  assertEquals(result.count, 1);
  assertEquals(result.missing, [OTHER]);
});

Deno.test("post-get: web links are converted before the request", async () => {
  const { ctx, calls } = mockCtx([ok({ posts: [] })], { display });
  await action.execute!({ uris: "https://bsky.app/profile/me.bsky.social/post/3k2a" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("uris"),
    "at://me.bsky.social/app.bsky.feed.post/3k2a",
  );
});

Deno.test("post-get: the batch limit is enforced before the request", async () => {
  const many = Array.from({ length: 26 }, (_, i) => `at://did:plc:a/app.bsky.feed.post/${i}`).join(
    ",",
  );
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ uris: many }, ctx),
    Error,
    "at most 25",
  );
  assertEquals(calls.length, 0);
});

Deno.test("post-get: nothing coming back is a full missing list, not an error", async () => {
  const { ctx } = mockCtx([ok({ posts: [] })], { display });
  const result = await action.execute!({ uris: POST_URI }, ctx) as { missing: string[] };
  assertEquals(result.missing, [POST_URI]);
});

Deno.test("post-get: needs URIs", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`uris` is required");
});

Deno.test("post-get: logs counts only", async () => {
  const { ctx, logs } = mockCtx([ok({ posts: [{ uri: POST_URI }] })], { display });
  await action.execute!({ uris: POST_URI }, ctx);
  assertEquals(logs[0].data, { asked: 1, count: 1 });
});

Deno.test("post-get: says absence is not an error", () => {
  assert(/ABSENT rather than null/.test(action.description!), action.description);
});

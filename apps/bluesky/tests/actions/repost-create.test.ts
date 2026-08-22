import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok, POST_URI } from "./_shared.ts";
import action from "../../actions/repost-create.ts";

const target = ok({ posts: [{ uri: POST_URI, cid: "cid-target" }] });
const created = ok({ uri: "at://did:plc:me/app.bsky.feed.repost/3new", cid: "bafy" });

/**
 * The record lives in YOUR repository and points at the post — it is not a flag
 * on the post, which is the single most common AT Protocol confusion.
 */
Deno.test("repost-create: writes a app.bsky.feed.repost record into the caller's own repo", async () => {
  const { ctx, calls } = mockCtx([target, created], { display });
  const result = await action.execute!({ uri: POST_URI }, ctx) as { uri: string; subject: string };
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.repo, "did:plc:me");
  assertEquals(body.collection, "app.bsky.feed.repost");
  assertEquals(body.record.subject, { uri: POST_URI, cid: "cid-target" });
  assert(body.record.createdAt, "no createdAt");
  assertEquals(
    result.uri,
    "at://did:plc:me/app.bsky.feed.repost/3new",
    "the record's own URI, not the post's",
  );
  assertEquals(result.subject, POST_URI);
});

/** The subject needs the CID as well as the URI — it pins the exact version. */
Deno.test("repost-create: fetches the post first, for its CID", async () => {
  const { ctx, calls } = mockCtx([target, created], { display });
  await action.execute!({ uri: POST_URI }, ctx);
  assert(calls[0].url.includes("getPosts"), calls[0].url);
});

Deno.test("repost-create: a post that cannot be found is refused with a reason", async () => {
  const { ctx } = mockCtx([ok({ posts: [] })], { display });
  const error = await assertRejects(
    async () => await action.execute!({ uri: POST_URI }, ctx),
    Error,
  );
  assert(/deleted, or from an account that blocks/.test(error.message), error.message);
});

/** There is no uniqueness constraint, so doing it twice orphans the first record. */
Deno.test("repost-create: an existing one is reported and warned about", async () => {
  const existing = ok({
    posts: [{
      uri: POST_URI,
      cid: "cid-target",
      viewer: { repost: "at://did:plc:me/app.bsky.feed.repost/3old" },
    }],
  });
  const { ctx, logs } = mockCtx([existing, created], { display });
  const result = await action.execute!({ uri: POST_URI }, ctx) as { alreadyExisted: boolean };
  assertEquals(result.alreadyExisted, true);
  assertEquals(logs[0].level, "warn");
  assert(/orphaned/.test(logs[0].message), logs[0].message);
});

Deno.test("repost-create: a bsky.app link works", async () => {
  const { ctx, calls } = mockCtx([target, created], { display });
  await action.execute!({ uri: "https://bsky.app/profile/a.bsky.social/post/3k2a" }, ctx);
  assert(calls[0].url.includes("a.bsky.social"), calls[0].url);
});

Deno.test("repost-create: needs a post", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`uri` is required");
});

Deno.test("repost-create: is non-idempotent, because a retry makes a second record", () => {
  assertEquals(action.idempotent, false);
});

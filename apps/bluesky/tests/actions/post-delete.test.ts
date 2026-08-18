import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, MY_POST_URI, ok, POST_URI } from "./_shared.ts";
import action from "../../actions/post-delete.ts";

Deno.test("post-delete: deletes by repo, collection and rkey", async () => {
  const { ctx, calls } = mockCtx([ok({})], { display });
  const result = await action.execute!({ uri: MY_POST_URI }, ctx);
  assertEquals(calls[0].url, "https://bsky.social/xrpc/com.atproto.repo.deleteRecord");
  assertEquals(JSON.parse(calls[0].body!), {
    repo: "did:plc:me",
    collection: "app.bsky.feed.post",
    rkey: "3k2a",
  });
  assertEquals(result, { deleted: true, uri: MY_POST_URI });
});

/** A session writes to one repository; there is no moderation path here. */
Deno.test("post-delete: someone else's post is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ uri: POST_URI }, ctx),
    Error,
  );
  assert(/reported, not deleted/.test(error.message), error.message);
  assertEquals(calls.length, 0);
});

Deno.test("post-delete: a like URI in the post slot is caught, with where to go", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ uri: "at://did:plc:me/app.bsky.feed.like/3k9z" }, ctx),
    Error,
    "like-delete",
  );
  assertEquals(calls.length, 0);
});

Deno.test("post-delete: a bsky.app link works, once it is your own post", async () => {
  const { ctx, calls } = mockCtx([ok({})], { display });
  await action.execute!({ uri: "https://bsky.app/profile/did:plc:me/post/3k2a" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).rkey, "3k2a");
});

Deno.test("post-delete: needs a URI", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`uri` is required");
});

/** Deleting is a request to a federated network, not an erasure. */
Deno.test("post-delete: says what deletion does and does not reach", () => {
  assert(/firehose/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});

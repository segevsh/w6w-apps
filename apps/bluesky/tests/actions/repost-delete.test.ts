import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok, POST_URI } from "./_shared.ts";
import action from "../../actions/repost-delete.ts";

const RECORD_URI = "at://did:plc:me/app.bsky.feed.repost/3old";

/** Given the record's own URI, it deletes directly. */
Deno.test("repost-delete: deletes the record when given its own URI", async () => {
  const { ctx, calls } = mockCtx([ok({})], { display });
  const result = await action.execute!({ uri: RECORD_URI }, ctx) as { deleted: boolean };
  assertEquals(calls.length, 1, "no lookup needed");
  assertEquals(JSON.parse(calls[0].body!), {
    repo: "did:plc:me",
    collection: "app.bsky.feed.repost",
    rkey: "3old",
  });
  assertEquals(result.deleted, true);
});

/**
 * Given the post instead — which is what people have — it finds this account's
 * own record through `viewer`. Deleting by post URI is what fails confusingly.
 */
Deno.test("repost-delete: given a post, it finds the caller's own record first", async () => {
  const found = ok({ posts: [{ uri: POST_URI, cid: "c", viewer: { repost: RECORD_URI } }] });
  const { ctx, calls } = mockCtx([found, ok({})], { display });
  const result = await action.execute!({ uri: POST_URI }, ctx) as { uri: string };
  assert(calls[0].url.includes("getPosts"), calls[0].url);
  assertEquals(JSON.parse(calls[1].body!).rkey, "3old");
  assertEquals(result.uri, RECORD_URI);
});

/** The desired state is already the actual state. */
Deno.test("repost-delete: nothing to remove is not an error", async () => {
  const found = ok({ posts: [{ uri: POST_URI, cid: "c", viewer: {} }] });
  const { ctx, calls } = mockCtx([found], { display });
  const result = await action.execute!({ uri: POST_URI }, ctx) as {
    deleted: boolean;
    wasPresent: boolean;
  };
  assertEquals(result, { deleted: false, wasPresent: false });
  assertEquals(calls.length, 1, "no delete attempted");
});

Deno.test("repost-delete: someone else's record is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ uri: "at://did:plc:other/app.bsky.feed.repost/3old" }, ctx),
    Error,
    "not to this connection",
  );
  assertEquals(calls.length, 0);
});

Deno.test("repost-delete: needs something to act on", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error);
});

Deno.test("repost-delete: is idempotent, since removing twice is the same end state", () => {
  assertEquals(action.idempotent, true);
});

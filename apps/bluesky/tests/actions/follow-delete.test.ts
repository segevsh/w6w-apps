import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/follow-delete.ts";

const FOLLOW_URI = "at://did:plc:me/app.bsky.graph.follow/3old";

Deno.test("follow-delete: deletes directly when given the follow's URI", async () => {
  const { ctx, calls } = mockCtx([ok({})], { display });
  const result = await action.execute!({ actor: FOLLOW_URI }, ctx) as { deleted: boolean };
  assertEquals(calls.length, 1, "no lookup needed");
  assertEquals(JSON.parse(calls[0].body!).rkey, "3old");
  assertEquals(result.deleted, true);
});

/** Deleting by DID is impossible — deleteRecord addresses by rkey. */
Deno.test("follow-delete: given an account, it finds the follow record first", async () => {
  const profile = ok({ viewer: { following: FOLLOW_URI } });
  const { ctx, calls } = mockCtx([profile, ok({})], { display });
  const result = await action.execute!({ actor: "@alice.bsky.social" }, ctx) as { uri: string };
  assertEquals(new URL(calls[0].url).searchParams.get("actor"), "alice.bsky.social");
  assertEquals(JSON.parse(calls[1].body!).rkey, "3old");
  assertEquals(result.uri, FOLLOW_URI);
});

Deno.test("follow-delete: not following is not an error", async () => {
  const { ctx, calls } = mockCtx([ok({ viewer: {} })], { display });
  const result = await action.execute!({ actor: "alice.bsky.social" }, ctx);
  assertEquals(result, { deleted: false, wasFollowing: false });
  assertEquals(calls.length, 1);
});

Deno.test("follow-delete: a like URI in the follow slot is caught", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ actor: "at://did:plc:me/app.bsky.feed.like/3old" }, ctx),
    Error,
    "not a follow",
  );
  assertEquals(calls.length, 0);
});

Deno.test("follow-delete: someone else's follow record is refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ actor: "at://did:plc:other/app.bsky.graph.follow/3old" }, ctx),
    Error,
    "not to this connection",
  );
});

Deno.test("follow-delete: needs an account", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`actor` is required");
});

Deno.test("follow-delete: is idempotent", () => {
  assertEquals(action.idempotent, true);
  assert(/FOLLOW record's URI/.test(action.description!), action.description);
});

import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/follow-create.ts";

const profile = ok({ did: "did:plc:alice", handle: "alice.bsky.social", viewer: {} });
const created = ok({ uri: "at://did:plc:me/app.bsky.graph.follow/3new", cid: "bafy" });

/** The record stores the DID; a handle is a rented name that can change hands. */
Deno.test("follow-create: resolves the handle to a DID before writing", async () => {
  const { ctx, calls } = mockCtx([profile, created], { display });
  const result = await action.execute!({ actor: "@alice.bsky.social" }, ctx) as { did: string };
  assertEquals(new URL(calls[0].url).searchParams.get("actor"), "alice.bsky.social");
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.collection, "app.bsky.graph.follow");
  assertEquals(body.record.subject, "did:plc:alice", "the DID, not the handle");
  assertEquals(result.did, "did:plc:alice");
});

Deno.test("follow-create: returns the follow record's own URI, which unfollowing needs", async () => {
  const { ctx } = mockCtx([profile, created], { display });
  const result = await action.execute!({ actor: "alice.bsky.social" }, ctx) as { uri: string };
  assertEquals(result.uri, "at://did:plc:me/app.bsky.graph.follow/3new");
});

/** No uniqueness constraint — a second follow orphans the first. */
Deno.test("follow-create: an existing follow is reported and warned about", async () => {
  const existing = ok({
    did: "did:plc:alice",
    handle: "alice.bsky.social",
    viewer: { following: "at://did:plc:me/app.bsky.graph.follow/3old" },
  });
  const { ctx, logs } = mockCtx([existing, created], { display });
  const result = await action.execute!({ actor: "alice.bsky.social" }, ctx) as {
    alreadyFollowing: boolean;
  };
  assertEquals(result.alreadyFollowing, true);
  assertEquals(logs[0].level, "warn");
});

Deno.test("follow-create: following yourself is refused", async () => {
  const self = ok({ did: "did:plc:me", handle: "me.bsky.social", viewer: {} });
  const { ctx, calls } = mockCtx([self], { display });
  await assertRejects(
    async () => await action.execute!({ actor: "me.bsky.social" }, ctx),
    Error,
    "cannot follow itself",
  );
  assertEquals(calls.length, 1, "nothing written");
});

Deno.test("follow-create: an unresolvable account is refused", async () => {
  const { ctx } = mockCtx([ok({ handle: "ghost" })], { display });
  await assertRejects(
    async () => await action.execute!({ actor: "ghost.bsky.social" }, ctx),
    Error,
    "could not resolve",
  );
});

Deno.test("follow-create: needs an account", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`actor` is required");
});

Deno.test("follow-create: logs the DID, not the handle", async () => {
  const { ctx, logs } = mockCtx([profile, created], { display });
  await action.execute!({ actor: "alice.bsky.social" }, ctx);
  assertEquals(logs[0].data, { did: "did:plc:alice" });
});

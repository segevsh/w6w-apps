import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/profile-get.ts";

const two = ok({
  profiles: [
    { did: "did:plc:alice", handle: "alice.bsky.social", viewer: { following: "at://x" } },
    { did: "did:plc:bob", handle: "bob.bsky.social", viewer: {} },
  ],
});

Deno.test("profile-get: batches accounts and exposes the first for the single case", async () => {
  const { ctx, calls } = mockCtx([two], { display });
  const result = await action.execute!({ actors: "alice.bsky.social, bob.bsky.social" }, ctx) as {
    count: number;
    profile: { handle: string };
  };
  assertEquals(
    new URL(calls[0].url).searchParams.get("actors"),
    "alice.bsky.social,bob.bsky.social",
  );
  assertEquals(result.count, 2);
  assertEquals(result.profile.handle, "alice.bsky.social");
});

/** The caller may have given either identifier, so matching accepts both. */
Deno.test("profile-get: an account that did not resolve is reported, by either identifier", async () => {
  const { ctx } = mockCtx([two], { display });
  const byHandle = await action.execute!({
    actors: "alice.bsky.social,ghost.bsky.social",
  }, ctx) as { missing: string[] };
  assertEquals(byHandle.missing, ["ghost.bsky.social"]);

  const second = mockCtx([two], { display });
  const byDid = await action.execute!({ actors: "did:plc:alice,did:plc:ghost" }, second.ctx) as {
    missing: string[];
  };
  assertEquals(byDid.missing, ["did:plc:ghost"]);
});

Deno.test("profile-get: a leading @ is stripped", async () => {
  const { ctx, calls } = mockCtx([two], { display });
  await action.execute!({ actors: "@alice.bsky.social" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("actors"), "alice.bsky.social");
});

Deno.test("profile-get: the batch limit is enforced before the request", async () => {
  const many = Array.from({ length: 26 }, (_, i) => `a${i}.bsky.social`).join(",");
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ actors: many }, ctx),
    Error,
    "at most 25",
  );
  assertEquals(calls.length, 0);
});

Deno.test("profile-get: needs accounts", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`actors` is required");
});

/** `viewer.following` is a URI or absent — never a boolean. */
Deno.test("profile-get: the viewer block is passed through untouched", async () => {
  const { ctx } = mockCtx([two], { display });
  const result = await action.execute!({ actors: "alice.bsky.social" }, ctx) as {
    profiles: Array<{ viewer: { following?: string } }>;
  };
  assertEquals(result.profiles[0].viewer.following, "at://x");
  assertEquals(result.profiles[1].viewer.following, undefined);
});

Deno.test("profile-get: says where the relationship answers live", () => {
  assert(/`viewer` block/.test(action.description!), action.description);
});

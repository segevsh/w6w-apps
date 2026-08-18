import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/follows-list.ts";

const page = ok({
  follows: [{ did: "did:plc:a", handle: "a.bsky.social" }],
  subject: { did: "did:plc:alice" },
  cursor: "c1",
});

Deno.test("follows-list: calls getFollows for the named account", async () => {
  const { ctx, calls } = mockCtx([page], { display });
  const result = await action.execute!({ actor: "@alice.bsky.social" }, ctx) as { count: number };
  const url = new URL(calls[0].url);
  assert(url.pathname.endsWith("app.bsky.graph.getFollows"), url.pathname);
  assertEquals(url.searchParams.get("actor"), "alice.bsky.social");
  assertEquals(result.count, 1);
});

/** One page is not the answer for a popular account. */
Deno.test("follows-list: hasMore is stated rather than left to be inferred", async () => {
  const more = mockCtx([page], { display });
  const withMore = await action.execute!({ actor: "alice.bsky.social" }, more.ctx) as {
    hasMore: boolean;
  };
  assertEquals(withMore.hasMore, true);

  const last = mockCtx([ok({ follows: [] })], { display });
  const atEnd = await action.execute!({ actor: "alice.bsky.social" }, last.ctx) as {
    hasMore: boolean;
    count: number;
  };
  assertEquals(atEnd.hasMore, false);
  assertEquals(atEnd.count, 0);
});

Deno.test("follows-list: the limit is clamped and the cursor passed", async () => {
  const { ctx, calls } = mockCtx([page], { display });
  await action.execute!({ actor: "alice.bsky.social", limit: 999, cursor: "c0" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("cursor"), "c0");
});

Deno.test("follows-list: the subject is returned alongside the page", async () => {
  const { ctx } = mockCtx([page], { display });
  const result = await action.execute!({ actor: "alice.bsky.social" }, ctx) as {
    subject: { did: string };
  };
  assertEquals(result.subject.did, "did:plc:alice");
});

Deno.test("follows-list: needs an account", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`actor` is required");
  assertEquals(calls.length, 0);
});

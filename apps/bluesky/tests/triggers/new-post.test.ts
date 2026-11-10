import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "../actions/_shared.ts";
import trigger from "../../triggers/new-post.ts";

const input = { params: { query: "deno" }, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) => mockCtx([ok({ posts: items })], { display });
const item = (id: string) => ({ uri: id });

test("new-post: seeds, emits only new items, retries idempotently, requests newest first", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://bsky.social/xrpc/app.bsky.feed.searchPosts?q=deno&sort=latest&limit=100",
  );

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMattermostCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-post.ts";
import { clock } from "../../lib/since.ts";

const input = { params: { channelId: "c1" }, subscriptionId: "sub-1" };
const NOW = 1_794_700_000_000;
clock.now = () => NOW;
const post = (id: string, createAt = NOW) => ({ id, create_at: createAt });
/** `order` lists ids newest-first; the `posts` map is deliberately in a DIFFERENT key order. */
const response = (order: string[], extra: Record<string, unknown> = {}) => {
  const posts: Record<string, unknown> = { ...extra };
  for (const id of [...order].reverse()) posts[id] = post(id, NOW + order.indexOf(id) * -1000);
  return { order, posts };
};
const ctx = (order: string[], extra: Record<string, unknown> = {}) =>
  mockMattermostCtx([{ body: response(order, extra) }]);

test("new-post: seeds, emits only new posts read through `order`, retries idempotently, requests since", async () => {
  const seed = ctx(["a"]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const request = new URL(seed.calls[0].url);
  assertEquals({
    method: seed.calls[0].method,
    path: request.pathname,
    query: Object.fromEntries(request.searchParams),
  }, {
    method: "GET",
    path: "/api/v4/channels/c1/posts",
    // cursor (NOW) - 120 s, in ms; `since` takes no page/per_page.
    query: { since: "1794699880000" },
  });

  const later = { ...input, state: seeded.nextState };
  const first = await trigger.poll!(later, ctx(["c", "b", "a"]).ctx);
  const retry = await trigger.poll!(later, ctx(["c", "b", "a"]).ctx);
  // Map order is a, b, c (reverse of `order`); `order` is the truth: oldest-first emit is b then c.
  assertEquals(first.events, [post("b", NOW - 1000), post("c", NOW)]);
  assertEquals(retry, first);
});

test("new-post: a post only edited (created before the window) is not emitted as new", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx(["a"]).ctx);
  const old = { z: post("z", NOW - 3_600_000) };
  const res = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["a"], old).ctx);
  assertEquals(res.events, []);
});

test("new-post: ids absent from `posts` are skipped, not thrown", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx(["a"]).ctx);
  const c = mockMattermostCtx([{
    body: { order: ["ghost", "n"], posts: { n: post("n") } },
  }]);
  const res = await trigger.poll!({ ...input, state: seeded.nextState }, c.ctx);
  assertEquals(res.events, [post("n")]);
});

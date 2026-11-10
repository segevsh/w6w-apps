import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMattermostCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-post.ts";

const input = { params: { channelId: "c1" }, subscriptionId: "sub-1" };
const response = (ids: string[]) => ({
  order: ids,
  posts: Object.fromEntries(ids.map((id) => [id, { id }])),
});
const ctx = (ids: string[]) => mockMattermostCtx([{ body: response(ids) }]);

test("new-post: seeds, emits only new items, retries idempotently, and requests its feed", async () => {
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
    query: { page: "0", per_page: "100", since: "0" },
  });
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["b", "a"]).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(["b", "a"]).ctx);
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});

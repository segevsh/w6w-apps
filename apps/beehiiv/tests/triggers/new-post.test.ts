import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-post.ts";

test("new-post seeds, emits, retries, and requests newest-first posts", async () => {
  const params = { publicationId: "pub_1" };
  const seed = await trigger.poll!(
    { params, state: {} },
    mockCtx([{ body: { data: [{ id: "a" }] } }]).ctx,
  );
  assertEquals(seed.events, []);
  const nextCtx = mockCtx([{ body: { data: [{ id: "b" }, { id: "a" }] } }]);
  const next = await trigger.poll!({ params, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ id: "b" }]);
  const retry = await trigger.poll!(
    { params, state: seed.nextState },
    mockCtx([{ body: { data: [{ id: "b" }, { id: "a" }] } }]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://api.beehiiv.com/v2/publications/pub_1/posts?limit=100&page=1&order_by=created&direction=desc",
  );
});

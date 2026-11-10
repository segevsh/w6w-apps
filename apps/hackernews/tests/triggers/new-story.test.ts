import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-story.ts";

const input = { params: {}, subscriptionId: "sub-1" };

test("new-story seeds, emits new ids, retries idempotently, and requests the literal newest list", async () => {
  const seedCtx = mockCtx([{ body: [2, 1] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seedCtx.calls[0].method, "GET");
  assertEquals(seedCtx.calls[0].url, "https://hacker-news.firebaseio.com/v0/newstories.json");

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [3, 2] }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: [3, 2] }]).ctx,
  );
  assertEquals(first.events, [{ id: 3 }]);
  assertEquals(retry, first);
});

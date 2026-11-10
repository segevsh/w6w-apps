import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-actor.ts";

const input = { params: {}, subscriptionId: "sub-1" };

test("new-actor: seeds, emits new actors, retries idempotently, and requests newest first", async () => {
  const seed = mockCtx([{ body: listEnvelope([{ id: "actor-1", name: "First" }]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.apify.com/v2/actors?sortBy=createdAt&desc=1&limit=100&offset=0",
  );

  const response = {
    body: listEnvelope([{ id: "actor-2", name: "Second" }, { id: "actor-1", name: "First" }]),
  };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([response]).ctx);
  assertEquals(first.events, [{ id: "actor-2", name: "Second" }]);
  assertEquals(retry, first);
});

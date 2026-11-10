import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-conversation.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id, title: `Meeting ${id}` });
const ctx = (data: unknown[]) => mockCtx([{ body: { meta: {}, data } }]);

test("new-conversation: seeds, emits unseen items, retries idempotently, and requests the newest page", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.otter.ai/v1/conversations?limit=20");

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

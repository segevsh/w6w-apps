import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-order.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string, dlm: string) => ({ id, dlm });
const editedRow = item("1", "200");
const ctx = (items: unknown[]) => mockCtx([{ body: listEnvelope(items) }]);

test("new-or-updated-order: seeds, emits only unseen items, retries idempotently, requests Orders sorted by dlm descending", async () => {
  const seed = ctx([item("1", "100")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.ontraport.com/1/Orders?range=50&sort=dlm&sortDir=desc",
  );

  const page = [editedRow, item("1", "100")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [editedRow]);
  assertEquals(retry, first);
});

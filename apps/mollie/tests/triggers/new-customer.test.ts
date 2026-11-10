import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { list, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";
const item = (id: string) => ({ id });
const ctx = (items: unknown[]) => mockCtx([{ body: list("customers", items) }]);
test("new-customer seeds, emits customers, retries, and requests descending order", async () => {
  const seed = ctx([item("a")]);
  const input = { params: {}, state: {}, subscriptionId: "sub" };
  const seeded = await trigger.poll!(input, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.mollie.com/v2/customers?limit=100&sort=desc");
  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

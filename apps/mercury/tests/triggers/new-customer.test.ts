import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

const item = (id: string) => ({ id });
const ctx = (items: unknown[]) => mockCtx([{ body: { customers: items, page: {} } }]);

test("new-customer seeds, emits new customers, retries, and requests descending order", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "sub" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.mercury.com/api/v1/ar/customers?limit=100&order=desc",
  );
  const page = [item("b"), item("a")];
  const first = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "sub" },
    ctx(page).ctx,
  );
  const retry = await trigger.poll!(
    { params: {}, state: seeded.nextState, subscriptionId: "sub" },
    ctx(page).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

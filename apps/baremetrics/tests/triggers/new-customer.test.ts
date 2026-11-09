import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

const input = { params: { sourceId: "src1" }, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) => mockCtx([{ body: { customers: items } }]);
const item = (id: string) => ({ oid: id });

test("new-customer: seeds, emits only new items, retries idempotently, requests newest first", async () => {
  const seed = ctx([item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.baremetrics.com/v1/src1/customers?sort=created&order=desc&per_page=100&page=0",
  );

  const page = [item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});

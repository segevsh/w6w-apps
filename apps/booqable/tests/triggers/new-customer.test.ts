import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockBooqableCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

test("new-customer seeds, emits, retries, and requests customers by creation date", async () => {
  const seed = await trigger.poll!(
    { params: {}, state: {} },
    mockBooqableCtx([{ body: { data: [{ id: "a" }] } }]).ctx,
  );
  assertEquals(seed.events, []);
  const nextCtx = mockBooqableCtx([{ body: { data: [{ id: "b" }, { id: "a" }] } }]);
  const next = await trigger.poll!({ params: {}, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ id: "b" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seed.nextState },
    mockBooqableCtx([{ body: { data: [{ id: "b" }, { id: "a" }] } }]).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://acme.booqable.com/api/4/customers?sort=-created_at&page%5Bnumber%5D=1&page%5Bsize%5D=100",
  );
});

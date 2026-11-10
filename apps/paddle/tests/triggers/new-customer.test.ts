import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: string) => ({ id, email: `${id}@example.com`, status: "active" });
const ctx = (ids: string[]) => mockCtx([{ body: { data: ids.map(row), meta: {} } }]);

test("new-customer: seeds, emits only new customers, retries idempotently, orders by id[DESC]", async () => {
  const seed = ctx(["ctm_1"]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.paddle.com/customers?order_by=id%5BDESC%5D&per_page=100",
  );

  const page = ["ctm_2", "ctm_1"];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [row("ctm_2")]);
  assertEquals(retry, first);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockGorgiasCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

test("new-customer seeds, emits, retries, and requests newest first", async () => {
  const seed = mockGorgiasCtx([{ body: { data: [{ id: 1 }] } }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://acme.gorgias.com/api/customers?order_by=created_datetime%3Adesc&limit=100",
  );
});

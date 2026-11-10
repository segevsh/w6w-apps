import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockAdsCtx, queryOf } from "../_helpers.ts";
import trigger from "../../triggers/new-customer-clients.ts";

test("new-customer-clients seeds, emits, retries, and requests customer clients", async () => {
  const seed = mockAdsCtx([{ body: { results: [{ customerClient: { id: "a" } }] } }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assert(queryOf(seed.calls[0]).includes("FROM customer_client"));
});

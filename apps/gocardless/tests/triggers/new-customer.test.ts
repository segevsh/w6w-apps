import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

test("new-customer seeds, emits, retries, and requests newest first", async () => {
  const seed = mockCtx([{ body: listEnvelope("customers", [{ id: "a" }]) }]);
  const first = await trigger.poll!({ params: {}, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(first.events, []);
  assertEquals((first.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.gocardless.com/customers?limit=100&sort_field=created_at&sort_direction=desc",
  );
  const page = [{ id: "b" }, { id: "a" }];
  const next = await trigger.poll!(
    { params: {}, state: first.nextState, subscriptionId: "s" },
    mockCtx([{ body: listEnvelope("customers", page) }]).ctx,
  );
  assertEquals(next.events, [{ id: "b" }]);
});

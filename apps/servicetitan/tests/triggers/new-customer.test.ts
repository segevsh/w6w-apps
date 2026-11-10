import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newOrUpdatedCustomer from "../../triggers/new-or-updated-customer.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: number) => ({ id, modifiedOn: "2026-11-09T12:00:00.000Z" });

test("ServiceTitan customer triggers seed, emit, retry, and request literal since filters", async () => {
  const original = clock.now;
  clock.now = () => Date.parse("2026-11-09T12:02:00.000Z");
  try {
    for (
      const [trigger, filter] of [[newCustomer, "createdOnOrAfter"], [
        newOrUpdatedCustomer,
        "modifiedOnOrAfter",
      ]] as const
    ) {
      const seed = mockCtx([{ body: { data: [row(1)] } }], { display: { tenantId: "42" } });
      const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(seed.calls[0].method, "GET");
      assertEquals(
        seed.calls[0].url,
        `https://api.servicetitan.io/crm/v2/tenant/42/customers?${filter}=2026-11-09T12%3A00%3A00.000Z&page=1&pageSize=100`,
      );
      const next = { data: [row(2), row(1)] };
      const first = await trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: next }], { display: { tenantId: "42" } }).ctx,
      );
      const retry = await trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: next }], { display: { tenantId: "42" } }).ctx,
      );
      assertEquals(first.events, [row(2)]);
      assertEquals(retry, first);
    }
  } finally {
    clock.now = original;
  }
});

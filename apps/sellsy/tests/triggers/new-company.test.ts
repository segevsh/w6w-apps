import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newCompany from "../../triggers/new-company.ts";
import newOrUpdatedCompany from "../../triggers/new-or-updated-company.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: number, updated_at = "2026-11-09T12:00:00Z") => ({ id, updated_at });
const result = (data: unknown[]) => ({ data, pagination: null });

test("Sellsy company triggers seed, emit, retry, and request literal sorts", async () => {
  for (
    const [trigger, order] of [[newCompany, "created_at"], [
      newOrUpdatedCompany,
      "updated_at",
    ]] as const
  ) {
    const seed = mockCtx([{ body: result([item(1)]) }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(
      seed.calls[0].url,
      `https://api.sellsy.com/v2/companies/search?limit=100&order=${order}&direction=desc`,
    );
    assertEquals(JSON.parse(seed.calls[0].body!), { filters: {} });
    const page = result([item(2), item(1)]);
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page }]).ctx,
    );
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page }]).ctx,
    );
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  }
});

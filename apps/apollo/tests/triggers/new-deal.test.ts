import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-deal.ts";
const page = (opportunities: unknown[]) => ({ opportunities, pagination: {} });
test("new-deal seeds, emits, retries, and requests the selected sort", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seed = mockCtx([{ body: page([{ id: "a" }]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.apollo.io/api/v1/opportunities/search?sort_by_field=closed_date&page=1&per_page=100",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page([{ id: "b" }, { id: "a" }]) }]).ctx,
  );
  assertEquals(first.events, [{ id: "b" }]);
  assertEquals(retry, first);
});

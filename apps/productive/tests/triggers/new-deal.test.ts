import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-deal.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-deal: seeds, emits new rows, retries idempotently, and requests the ordered feed", async () => {
  const seed = ctx({ data: [{ id: "a" }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.productive.io/api/v2/deals?sort=-created_at&page%5Bsize%5D=100&page%5Bnumber%5D=1",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ id: "b" }, { id: "a" }] }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ id: "b" }, { id: "a" }] }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

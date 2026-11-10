import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-refund.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: number, createdAt: string) => ({ id, createdAt });
const page = (...items: unknown[]) => [{ body: { status: true, data: items, meta: {} } }];

test("new-refund: seeds without emitting and requests the first page unfiltered", async () => {
  const seed = mockCtx(page(item(1, "2026-11-09T14:08:41.000Z")));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.paystack.co/refund?perPage=50&per_page=50&page=1");
});

test("new-refund: after the seed, filters from the cursor and emits only the new record", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx(page(item(1, "2026-11-09T14:08:41.000Z"))).ctx,
  );
  const next = mockCtx(
    page(item(2, "2026-11-09T14:20:00.000Z"), item(1, "2026-11-09T14:08:41.000Z")),
  );
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(first.events, [item(2, "2026-11-09T14:20:00.000Z")]);
  assertEquals(next.calls[0].method, "GET");
  assertEquals(
    next.calls[0].url,
    "https://api.paystack.co/refund?perPage=50&per_page=50&page=1&from=2026-11-09T14%3A06%3A41.000Z",
  );
});

test("new-refund: the same state and responses give the same result (idempotent retry)", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx(page(item(1, "2026-11-09T14:08:41.000Z"))).ctx,
  );
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx(page(item(2, "2026-11-09T14:20:00.000Z"), item(1, "2026-11-09T14:08:41.000Z"))).ctx,
    );
  assertEquals(await run(), await run());
});

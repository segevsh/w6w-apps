import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-transaction.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: number, createdAt: string) => ({ id, createdAt });
const page = (...items: unknown[]) => [{ body: { status: true, data: items, meta: {} } }];
const realNow = Date.now;
afterEach(() => {
  Date.now = realNow;
});
const at = (iso: string) => {
  Date.now = () => Date.parse(iso);
};
// Record 1 was created before the first check (the floor); record 2 after it.
const OLD = "2026-11-09T14:08:41.000Z";
const NEW = "2026-11-09T14:20:00.000Z";

test("new-transaction: seeds without reading or emitting", async () => {
  at("2026-11-09T14:10:00.000Z");
  const seed = mockCtx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0);
});

test("new-transaction: after the seed, filters from the cursor minus the overlap and emits only the new record", async () => {
  at("2026-11-09T14:10:00.000Z");
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  at("2026-11-09T14:25:00.000Z");
  const next = mockCtx(page(item(2, NEW), item(1, OLD)));
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  assertEquals(first.events, [item(2, NEW)]);
  assertEquals(next.calls[0].method, "GET");
  assertEquals(
    next.calls[0].url,
    "https://api.paystack.co/transaction?perPage=50&per_page=50&page=1&from=2026-11-09T14%3A08%3A00.000Z",
  );
});

test("new-transaction: the same state and responses give the same result (idempotent retry)", async () => {
  at("2026-11-09T14:10:00.000Z");
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  at("2026-11-09T14:25:00.000Z");
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx(page(item(2, NEW), item(1, OLD))).ctx,
    );
  assertEquals(await run(), await run());
});

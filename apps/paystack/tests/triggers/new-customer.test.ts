import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-customer.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: number, createdAt: string) => ({ id, createdAt });
const page = (...items: unknown[]) => [{ body: { status: true, data: items, meta: {} } }];

test("new-customer: seeds without emitting and requests the first page unfiltered", async () => {
  const seed = mockCtx(page(item(1, "2026-11-09T14:08:41.000Z")));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.paystack.co/customer?perPage=50&per_page=50&page=1");
});

test("new-customer: after the seed, filters from the cursor and emits only the new record", async () => {
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
    "https://api.paystack.co/customer?perPage=50&per_page=50&page=1&from=2026-11-09T14%3A06%3A41.000Z",
  );
});

test("new-customer: the same state and responses give the same result (idempotent retry)", async () => {
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

test("new-customer: 101-150 new rows are all emitted across two checks (none skipped, none twice)", async () => {
  const base = Date.parse("2026-11-09T14:00:00.000Z");
  const row = (n: number) => item(n, new Date(base + n * 1000).toISOString());
  const range = (from: number, to: number) => {
    const out = [];
    for (let n = from; n >= to; n--) out.push(row(n));
    return out;
  };
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx(page(row(1))).ctx,
  );
  // 140 new rows (ids 2..141), newest first over three pages of 50 / 50 / 41 (incl. seeded id 1).
  const firstCheck = mockCtx([
    ...page(...range(141, 92)),
    ...page(...range(91, 42)),
    ...page(...range(41, 1)),
  ]);
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, firstCheck.ctx);
  assertEquals(first.events.length, 100);
  assertEquals(
    (first.events as { id: number }[]).map((e) => e.id),
    range(101, 2).reverse().map((e) => e.id),
  );
  const secondCheck = mockCtx([...page(...range(141, 92)), ...page(...range(91, 42))]);
  const second = await trigger.poll!({ ...input, state: first.nextState }, secondCheck.ctx);
  assertEquals(
    (second.events as { id: number }[]).map((e) => e.id),
    range(141, 102).reverse().map((e) => e.id),
  );
  // the request window still reaches the unemitted rows: cursor stayed at the newest EMITTED stamp
  assertEquals(
    secondCheck.calls[0].url,
    `https://api.paystack.co/customer?perPage=50&per_page=50&page=1&from=${
      encodeURIComponent(new Date(base + 101 * 1000 - 120_000).toISOString())
    }`,
  );
});

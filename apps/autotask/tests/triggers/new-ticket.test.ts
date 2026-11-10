import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-ticket.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const BASE = "https://webservices2.autotask.net/atservicesrest/V1.0";
const display = { display: { zone: "2" } };
const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const T1 = T0 + 300_000;
const item = (id: number) => ({ id, title: `Ticket ${id}` });
const page = (ids: number[], nextPageUrl: string | null = null) => ({
  body: {
    items: ids.map(item),
    pageDetails: { count: ids.length, requestCount: 500, nextPageUrl },
  },
});

async function at<T>(now: number, run: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => now;
  try {
    return await run();
  } finally {
    Date.now = real;
  }
}

test("new-ticket seeds, emits a new ticket, retries identically, and queries createDate", async () => {
  const seed = mockCtx([page([1])], display);
  const seeded = await at(T0, () => trigger.poll!({ ...input, state: {} }, seed.ctx));
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((seeded.nextState as { cursor?: number }).cursor, T0);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, `${BASE}/Tickets/query`);
  assertEquals(JSON.parse(seed.calls[0].body!), {
    filter: [{ op: "gt", field: "createDate", value: "2026-11-09T11:58:00.000Z" }],
    maxRecords: 500,
  });
  const run = () => {
    const m = mockCtx([page([2, 1])], display);
    return at(T1, () => trigger.poll!({ ...input, state: seeded.nextState }, m.ctx));
  };
  const first = await run();
  const retry = await run();
  assertEquals(first.events, [item(2)]);
  assertEquals(retry, first);
  assertEquals((first.nextState as { cursor?: number }).cursor, T1);
});

test("new-ticket reads at most 3 pages and then keeps the cursor so nothing is skipped", async () => {
  const seeded = await at(
    T0,
    () => trigger.poll!({ ...input, state: {} }, mockCtx([page([1])], display).ctx),
  );
  const next = (n: number) => `${BASE}/Tickets/query?paging=${n}`;
  const m = mockCtx(
    [page([2], next(2)), page([3], next(3)), page([4], next(4)), page([5])],
    display,
  );
  const got = await at(T1, () => trigger.poll!({ ...input, state: seeded.nextState }, m.ctx));
  assertEquals(m.calls.length, 3);
  assertEquals(m.calls[1].method, "GET");
  assertEquals(m.calls[1].url, next(2));
  assertEquals(got.events, [item(4), item(3), item(2)]);
  assertEquals((got.nextState as { cursor?: number }).cursor, T0);
});

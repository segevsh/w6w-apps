import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTransaction from "../../triggers/new-transaction.ts";
import newOrUpdatedTransaction from "../../triggers/new-or-updated-transaction.ts";
import newCampaign from "../../triggers/new-campaign.ts";
import newFund from "../../triggers/new-fund.ts";
import newPayout from "../../triggers/new-payout.ts";
import newMessage from "../../triggers/new-message.ts";

const BASE = "https://api.givebutter.com/v1";
const body = (items: unknown[], lastPage = 1) => ({
  data: items,
  links: {},
  meta: { current_page: 1, last_page: lastPage, per_page: 100, total: items.length },
});
const rec = (id: number) => ({ id, title: `r${id}` });

// Table-driven: every list-backed trigger shares one case set; each request URL is a literal.
const specs = [
  {
    name: "new-transaction",
    trigger: newTransaction,
    url: `${BASE}/transactions?sortByDesc=created_at&page=1&per_page=100`,
  },
  { name: "new-campaign", trigger: newCampaign, url: `${BASE}/campaigns?page=1&per_page=100` },
  { name: "new-fund", trigger: newFund, url: `${BASE}/funds?page=1&per_page=100` },
  { name: "new-payout", trigger: newPayout, url: `${BASE}/payouts?page=1&per_page=100` },
  { name: "new-message", trigger: newMessage, url: `${BASE}/messages?page=1&per_page=100` },
];

for (const { name, trigger, url } of specs) {
  const input = { params: {}, subscriptionId: "sub-1" };
  const ctx = (items: unknown[]) => mockCtx([{ status: 200, body: body(items) }]);

  test(`${name}: seeds without emitting, emits only the new item, retries idempotently`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, ctx([rec(1)]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const page = [rec(2), rec(1)];
    const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
    assertEquals(first.events, [rec(2)]);
    assertEquals(retry, first);
  });

  test(`${name}: sends the list action's literal request`, async () => {
    const seed = ctx([rec(1)]);
    await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
  });
}

test("snapshot triggers read every page of the collection", async () => {
  const input = { params: {}, subscriptionId: "sub-1" };
  const seeded = await newCampaign.poll!(
    { ...input, state: {} },
    mockCtx([{ body: body([rec(1), rec(2)], 2) }, { body: body([rec(3)], 2) }]).ctx,
  );
  assertEquals(seeded.events, []);
  const mock = mockCtx([{ body: body([rec(1), rec(2)], 2) }, { body: body([rec(3), rec(4)], 2) }]);
  const next = await newCampaign.poll!({ ...input, state: seeded.nextState }, mock.ctx);
  assertEquals(next.events, [rec(4)]);
  assertEquals(mock.calls.map((c) => c.url), [
    `${BASE}/campaigns?page=1&per_page=100`,
    `${BASE}/campaigns?page=2&per_page=100`,
  ]);
});

// ---- new-or-updated-transaction: since-filter poll (updatedAfter) ----
const input = { params: {}, subscriptionId: "sub-1" };
const SEED_AT = Date.parse("2026-11-10T12:00:00Z");
const realNow = Date.now;
const at = async <T>(iso: string, fn: () => Promise<T>): Promise<T> => {
  Date.now = () => Date.parse(iso);
  try {
    return await fn();
  } finally {
    Date.now = realNow;
  }
};
const txn = (id: number, updated: string) => ({
  id: `t${id}`,
  created_at: updated,
  updated_at: updated,
});
const OLD = "2026-11-10T11:59:00Z"; // inside the overlap window, but before the seed floor
const NEW = "2026-11-10T12:03:00Z";
const url = (since: string, page: number) =>
  `${BASE}/transactions?updatedAfter=${since}&sortBy=created_at&page=${page}&per_page=100`;
const SINCE_SEED = "2026-11-10T11%3A58%3A00.000Z"; // seed time minus the 120 s overlap
const page = (n: number, from: number, updated: string) =>
  Array.from({ length: n }, (_, i) => txn(from + i, updated));

test("new-or-updated-transaction: the seed reads nothing and emits nothing", async () => {
  const mock = mockCtx([]);
  const r = await at(
    "2026-11-10T12:00:00Z",
    () => newOrUpdatedTransaction.poll!({ ...input, state: {} }, mock.ctx),
  );
  assertEquals(r.events, []);
  assertEquals(mock.calls.length, 0);
  assertEquals((r.nextState as { seeded?: boolean }).seeded, true);
  assertEquals((r.nextState as { floor?: number }).floor, SEED_AT);
});

test("new-or-updated-transaction: pre-seed records never flood, however many pages the window holds", async () => {
  const seeded = await at(
    "2026-11-10T12:00:00Z",
    () => newOrUpdatedTransaction.poll!({ ...input, state: {} }, mockCtx([]).ctx),
  );
  let state = seeded.nextState;
  const urls: string[] = [];
  // Three full pages of records last updated BEFORE the seed (maxPages is 1 -> 3 checks to drain).
  for (let p = 1; p <= 3; p++) {
    const mock = mockCtx([{ body: body(page(100, p * 100, OLD), 3) }]);
    const r = await at(
      "2026-11-10T12:05:00Z",
      () => newOrUpdatedTransaction.poll!({ ...input, state }, mock.ctx),
    );
    assertEquals(r.events, []);
    urls.push(mock.calls[0].url);
    state = r.nextState;
  }
  assertEquals(urls, [url(SINCE_SEED, 1), url(SINCE_SEED, 2), url(SINCE_SEED, 3)]);
  // One record updated after the seed -> exactly that record.
  const mock = mockCtx([{ body: body([txn(900, NEW)]) }]);
  const r = await at(
    "2026-11-10T12:10:00Z",
    () => newOrUpdatedTransaction.poll!({ ...input, state }, mock.ctx),
  );
  assertEquals(r.events, [txn(900, NEW)]);
  // The drain finished, so the cursor moved to the time the window opened (12:05:00Z).
  assertEquals(mock.calls[0].url, url("2026-11-10T12%3A03%3A00.000Z", 1));
});

test("new-or-updated-transaction: a window longer than one page drains across checks, none twice", async () => {
  const seeded = await at(
    "2026-11-10T12:00:00Z",
    () => newOrUpdatedTransaction.poll!({ ...input, state: {} }, mockCtx([]).ctx),
  );
  let state = seeded.nextState;
  const got: unknown[] = [];
  const urls: string[] = [];
  for (let p = 1; p <= 3; p++) {
    const items = page(100, p * 100, NEW);
    // The overlap re-reads page 1 on the next window: dedupe must hold.
    const mock = mockCtx([{ body: body(items, 3) }]);
    const r = await at(
      "2026-11-10T12:05:00Z",
      () => newOrUpdatedTransaction.poll!({ ...input, state }, mock.ctx),
    );
    got.push(...r.events);
    urls.push(mock.calls[0].url);
    state = r.nextState;
  }
  assertEquals(got.length, 300);
  assertEquals(new Set(got.map((e) => (e as { id: string }).id)).size, 300);
  assertEquals(urls, [url(SINCE_SEED, 1), url(SINCE_SEED, 2), url(SINCE_SEED, 3)]);
  assertEquals((state as { resume?: unknown }).resume, undefined);
  assertEquals((state as { cursor?: number }).cursor, Date.parse("2026-11-10T12:05:00Z"));
  // Next window starts at the new cursor minus the overlap and re-reads page 1: nothing is emitted twice.
  const mock = mockCtx([{ body: body(page(100, 100, NEW)) }]);
  const again = await at(
    "2026-11-10T12:10:00Z",
    () => newOrUpdatedTransaction.poll!({ ...input, state }, mock.ctx),
  );
  assertEquals(again.events, []);
  assertEquals(mock.calls[0].url, url("2026-11-10T12%3A03%3A00.000Z", 1));
});

test("new-or-updated-transaction: an edited record is a new event; the same stamp is not; retries are idempotent", async () => {
  const seeded = await at(
    "2026-11-10T12:00:00Z",
    () => newOrUpdatedTransaction.poll!({ ...input, state: {} }, mockCtx([]).ctx),
  );
  const first = await at("2026-11-10T12:05:00Z", () =>
    newOrUpdatedTransaction.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: body([txn(1, NEW)]) }]).ctx,
    ));
  assertEquals(first.events, [txn(1, NEW)]);
  const same = await at("2026-11-10T12:10:00Z", () =>
    newOrUpdatedTransaction.poll!(
      { ...input, state: first.nextState },
      mockCtx([{ body: body([txn(1, NEW)]) }]).ctx,
    ));
  assertEquals(same.events, []);
  const edited = txn(1, "2026-11-10T12:08:00Z");
  const run = () =>
    at("2026-11-10T12:10:00Z", () =>
      newOrUpdatedTransaction.poll!(
        { ...input, state: first.nextState },
        mockCtx([{ body: body([edited]) }]).ctx,
      ));
  const a = await run();
  assertEquals(a.events, [edited]);
  assertEquals(await run(), a);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-payout.ts";
import { clock } from "../../lib/triggers.ts";

const FLOOR = Date.parse("2026-11-10T12:00:00Z");
const NOW = Date.parse("2026-11-10T13:00:00Z");
const base = "https://api.kajabi.com/v1/kajabi_payments_payouts?filter%5Bsite_id%5D=site-1";
const window = `${base}&filter%5Bstart_date%5D=2026-11-09`;
const tail = (page: number) => `&page%5Bnumber%5D=${page}`;

clock.now = () => NOW;

const seeded = {
  v: 1,
  kind: "since",
  seeded: true,
  floor: FLOOR,
  cursor: FLOOR,
  ids: [] as string[],
};
const payout = (id: string, at: string) => ({
  id,
  type: "kajabi_payments_payouts",
  attributes: { initiated_date: at },
});
const before = (i: number) => payout(`old-${i}`, "2026-11-01T00:00:00Z");
const after = (id: string, minutes = 1) =>
  payout(id, new Date(FLOOR + minutes * 60_000).toISOString());
const run = (state: unknown, responses: Array<{ body: unknown }>) => {
  const mock = mockCtx(responses);
  return trigger.poll!({ params: { siteId: "site-1" }, state } as never, mock.ctx).then((
    result,
  ) => ({ result, calls: mock.calls }));
};

test("new-payout: the site is required", () => {
  assertEquals(trigger.params?.find((p) => p.key === "siteId")?.required, true);
});

test("new-payout: the first check stores the floor, emits nothing and reads nothing", async () => {
  const { result, calls } = await run({}, []);
  assertEquals(result.events, []);
  assertEquals(result.nextState, { ...seeded, floor: NOW, cursor: NOW });
  assertEquals(calls.length, 0);
});

test("new-payout: requests exactly the day before the cursor, page 1, no page size", async () => {
  const { calls } = await run(seeded, [{ body: { data: [] } }]);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, window + tail(1));
});

test("new-payout: emits a payout initiated after the floor once, oldest first, and a retry repeats it", async () => {
  const late = after("late", 5), early = after("early", 1);
  const page = [{ body: { data: [late, early, before(1)] } }, { body: { data: [] } }];
  const first = await run(seeded, page);
  const retry = await run(seeded, page);
  assertEquals(first.result.events, [early, late]);
  assertEquals(first.calls.map((c) => c.url), [window + tail(1), window + tail(2)]);
  assertEquals(retry.result, first.result);
  const next = first.result.nextState as typeof seeded;
  assertEquals(next.cursor, NOW);
  assertEquals(next.ids, ["early", "late"]);
  const again = await run(next, [
    { body: { data: [late, early, before(1)] } },
    { body: { data: [] } },
  ]);
  assertEquals(again.result.events, []);
});

test("new-payout: a window longer than three pages drains over successive checks, none twice", async () => {
  const pg = (prefix: string) => ({
    body: { data: Array.from({ length: 3 }, (_, i) => after(`${prefix}-${i}`)) },
  });
  const one = await run(seeded, [pg("a"), pg("b"), pg("c")]);
  assertEquals(one.result.events.length, 9);
  assertEquals(one.calls.map((c) => c.url), [window + tail(1), window + tail(2), window + tail(3)]);
  const mid = one.result.nextState as typeof seeded & { resume?: { page: number } };
  assertEquals(mid.resume?.page, 4);
  assertEquals(mid.cursor, FLOOR);
  const two = await run(mid, [pg("d"), { body: { data: [] } }]);
  assertEquals(two.calls.map((c) => c.url), [window + tail(4), window + tail(5)]);
  assertEquals(two.result.events.length, 3);
  const ids = [...one.result.events, ...two.result.events].map((e) => (e as { id: string }).id);
  assertEquals(new Set(ids).size, 12);
  const done = two.result.nextState as typeof seeded & { resume?: unknown };
  assertEquals(done.resume, undefined);
  assertEquals(done.cursor, NOW);
});

test("new-payout: payouts initiated before the seed never flood in", async () => {
  const old = (prefix: string) => ({
    body: { data: [payout(`${prefix}-0`, "2026-11-01T00:00:00Z")] },
  });
  const one = await run(seeded, [old("a"), old("b"), old("c")]);
  assertEquals(one.result.events, []);
  const two = await run(one.result.nextState, [{ body: { data: [] } }]);
  assertEquals(two.result.events, []);
  const fresh = after("fresh", 30);
  const three = await run(two.result.nextState, [{ body: { data: [fresh, before(9)] } }, {
    body: { data: [] },
  }]);
  assertEquals(three.result.events, [fresh]);
});

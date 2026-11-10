import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-transaction.ts";
import { clock } from "../../lib/triggers.ts";

const FLOOR = Date.parse("2026-11-10T12:00:00Z");
const NOW = Date.parse("2026-11-10T13:00:00Z");
const base = "https://api.kajabi.com/v1/transactions?filter%5Bsite_id%5D=site-1";
const window = `${base}&filter%5Bstart_date%5D=2026-11-09`;
const tail = (page: number) => `&page%5Bnumber%5D=${page}&page%5Bsize%5D=100`;

clock.now = () => NOW;

const seeded = {
  v: 1,
  kind: "since",
  seeded: true,
  floor: FLOOR,
  cursor: FLOOR,
  ids: [] as string[],
};
const tx = (id: string, at: string) => ({
  id,
  type: "transactions",
  attributes: { created_at: at },
});
const before = (i: number) => tx(`old-${i}`, "2026-11-01T00:00:00Z");
const after = (id: string, minutes = 1) => tx(id, new Date(FLOOR + minutes * 60_000).toISOString());
const fullPage = (prefix: string, make: (id: string) => unknown) => ({
  body: { data: Array.from({ length: 100 }, (_, i) => make(`${prefix}-${i}`)) },
});
const run = (state: unknown, responses: Array<{ body: unknown }>) => {
  const mock = mockCtx(responses);
  return trigger.poll!({ params: { siteId: "site-1" }, state } as never, mock.ctx).then((
    result,
  ) => ({ result, calls: mock.calls }));
};

test("new-transaction: the first check stores the floor, emits nothing and reads nothing", async () => {
  const { result, calls } = await run({}, []);
  assertEquals(result.events, []);
  assertEquals(result.nextState, { ...seeded, floor: NOW, cursor: NOW });
  assertEquals(calls.length, 0);
});

test("new-transaction: requests exactly the day before the cursor, page 1 of 100", async () => {
  const { calls } = await run(seeded, [{ body: { data: [] } }]);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, window + tail(1));
});

test("new-transaction: emits a record created after the floor once, oldest first, and a retry repeats it", async () => {
  const late = after("late", 5), early = after("early", 1);
  const page = [{ body: { data: [late, early, before(1)] } }];
  const first = await run(seeded, page);
  const retry = await run(seeded, page);
  assertEquals(first.result.events, [early, late]);
  assertEquals(retry.result, first.result);
  const next = first.result.nextState as typeof seeded;
  assertEquals(next.cursor, NOW);
  assertEquals(next.ids, ["early", "late"]);
  const again = await run(next, [{ body: { data: [late, early, before(1)] } }]);
  assertEquals(again.result.events, []);
});

test("new-transaction: a window longer than three pages drains over successive checks, none twice", async () => {
  const mk = (id: string) => after(id);
  const one = await run(seeded, [fullPage("a", mk), fullPage("b", mk), fullPage("c", mk)]);
  assertEquals(one.result.events.length, 300);
  assertEquals(one.calls.map((c) => c.url), [window + tail(1), window + tail(2), window + tail(3)]);
  const mid = one.result.nextState as typeof seeded & { resume?: { page: number } };
  assertEquals(mid.resume?.page, 4);
  assertEquals(mid.cursor, FLOOR);
  clock.now = () => NOW + 60_000;
  const two = await run(mid, [fullPage("d", mk), { body: { data: [mk("e-0")] } }]);
  clock.now = () => NOW;
  assertEquals(two.calls.map((c) => c.url), [window + tail(4), window + tail(5)]);
  assertEquals(two.result.events.length, 101);
  const ids = [...one.result.events, ...two.result.events].map((e) => (e as { id: string }).id);
  assertEquals(new Set(ids).size, 401);
  const done = two.result.nextState as typeof seeded & { resume?: unknown };
  assertEquals(done.resume, undefined);
  assertEquals(done.cursor, NOW);
});

test("new-transaction: records created before the seed never flood in, however many pages the window holds", async () => {
  const old = (prefix: string) => ({
    body: {
      data: Array.from({ length: 100 }, (_, i) => tx(`${prefix}-${i}`, "2026-11-01T00:00:00Z")),
    },
  });
  const one = await run(seeded, [old("a"), old("b"), old("c")]);
  assertEquals(one.result.events, []);
  const two = await run(one.result.nextState, [old("d"), { body: { data: [before(9)] } }]);
  assertEquals(two.result.events, []);
  const drained = two.result.nextState as typeof seeded;
  const fresh = after("fresh", 30);
  const three = await run(drained, [{ body: { data: [fresh, before(9)] } }]);
  assertEquals(three.result.events, [fresh]);
});

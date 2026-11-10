import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import trigger from "../../triggers/new-contact.ts";

// Seed time 12:00:00Z; the first window starts 5 minutes (the overlap) before it.
const SEED = Date.parse("2026-11-09T12:00:00.000Z");
const OLD = "2026-11-09T09:00:00+00:00"; // created before the seed
const NEW = "2026-11-09T12:03:00+00:00"; // created after the seed
const rec = (id: string, at: string) => ({ id, added_at: at });
const run = (state: unknown) => (responses: unknown[]) => {
  const m = mockCtx(responses as never);
  return { m, p: trigger.poll!({ params: {}, subscriptionId: "sub-1", state }, m.ctx) };
};
const page = (prefix: string, at: string, n = 50) =>
  Array.from({ length: n }, (_, i) => rec(`${prefix}${i}`, at));
const body = (items: unknown[]) => ({
  data: items,
  meta: { page: { size: 50, number: 1 }, matches: items.length },
});
const seededAt = (cursor: number, ids: string[] = []) => ({
  v: 1,
  kind: "ids",
  seeded: true,
  ids,
  floor: SEED,
  cursor,
});

test("new-contact: seed stores floor=now and reads nothing", async () => {
  clock.now = () => SEED;
  const { m, p } = run({})([]);
  const r = await p;
  assertEquals(r.events, []);
  assertEquals(m.calls.length, 0);
  assertEquals(r.nextState, seededAt(SEED));
});

test("new-contact: emits exactly the new item, idempotent retry, literal request", async () => {
  clock.now = () => SEED + 600_000;
  const state = seededAt(SEED);
  const responses = [{ body: body([rec("old", OLD), rec("n1", NEW)]) }];
  const first = await run(state)(responses).p;
  const again = await run(state)(responses).p;
  assertEquals(first.events, [rec("n1", NEW)]);
  assertEquals(again, first);
  const m = mockCtx(responses as never);
  await trigger.poll!({ params: {}, subscriptionId: "sub-1", state }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "POST");
  assertEquals(JSON.parse(m.calls[0].body!), {
    filter: { updated_since: "2026-11-09T11:55:00.000Z" },
    page: { size: 50, number: 1 },
  });
  assertEquals(m.calls[0].url, "https://api.focus.teamleader.eu/contacts.list");
  assertEquals((first.nextState as { cursor: number }).cursor, SEED + 600_000);
});

test("new-contact: a window longer than maxPages resumes, emits all once, then advances the cursor", async () => {
  const state = seededAt(SEED);
  clock.now = () => SEED + 600_000;
  const c1 = mockCtx([{ body: body(page("a", NEW)) }, { body: body(page("b", NEW)) }]);
  const r1 = await trigger.poll!({ params: {}, subscriptionId: "sub-1", state }, c1.ctx);
  assertEquals(r1.events.length, 100);
  assertEquals(c1.calls.length, 2);
  const s1 = r1.nextState as { cursor: number; resume?: { since: number; page: number } };
  assertEquals(s1.cursor, SEED); // not advanced: the window is not drained
  assertEquals(s1.resume, { since: SEED - 300_000, page: 3 });

  clock.now = () => SEED + 900_000;
  const c2 = mockCtx([{ body: body(page("c", NEW)) }, { body: body([]) }]);
  const r2 = await trigger.poll!(
    { params: {}, subscriptionId: "sub-1", state: r1.nextState },
    c2.ctx,
  );
  assertEquals(r2.events.length, 50);
  assertEquals(JSON.parse(c2.calls[0].body!), {
    filter: { updated_since: "2026-11-09T11:55:00.000Z" }, // same window as the first check
    page: { size: 50, number: 3 },
  });
  assertEquals(JSON.parse(c2.calls[1].body!).page, { size: 50, number: 4 });
  const s2 = r2.nextState as { cursor: number; resume?: unknown };
  assertEquals(s2.cursor, SEED + 900_000);
  assertEquals(s2.resume, undefined);
  const ids = [...r1.events, ...r2.events].map((e) => e.id);
  assertEquals(new Set(ids).size, 150); // every item once, none twice
});

test("new-contact: records that existed before the seed never flood a later check", async () => {
  clock.now = () => SEED;
  const seeded = await run({})([]).p;
  assertEquals(seeded.events, []);

  clock.now = () => SEED + 600_000;
  const c1 = mockCtx([{ body: body(page("x", OLD)) }, { body: body(page("y", OLD)) }]);
  const r1 = await trigger.poll!(
    { params: {}, subscriptionId: "sub-1", state: seeded.nextState },
    c1.ctx,
  );
  assertEquals(r1.events, []);
  const c2 = mockCtx([{ body: body(page("z", OLD)) }, { body: body([]) }]);
  const r2 = await trigger.poll!(
    { params: {}, subscriptionId: "sub-1", state: r1.nextState },
    c2.ctx,
  );
  assertEquals(r2.events, []);

  clock.now = () => SEED + 900_000;
  const c3 = mockCtx([{ body: body([rec("x0", OLD), rec("fresh", NEW)]) }]);
  const r3 = await trigger.poll!(
    { params: {}, subscriptionId: "sub-1", state: r2.nextState },
    c3.ctx,
  );
  assertEquals(r3.events, [rec("fresh", NEW)]);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact.ts";
import { clock, MAX_PAGES } from "../../lib/walk.ts";

const NOW = Date.parse("2026-11-09T12:00:00.000Z");
clock.now = () => NOW;
const input = { params: {}, subscriptionId: "sub-1" };
const AFTER = "2026-11-09T12:30:00.000Z";
const BEFORE = "2026-11-09T11:00:00.000Z";
const row = (id: number, regDate = AFTER) => ({ id, regDate });
const page = (rows: unknown[]) => ({ body: { error: null, metadata: {}, data: rows } });
const full = (from: number, regDate: string) =>
  Array.from({ length: 1000 }, (_, i) => row(from + i, regDate));
const q = (url: string) => Object.fromEntries(new URL(url).searchParams);
const seed = () => trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);

test("new-contact: the first check seeds a floor and reads nothing", async () => {
  const c = mockCtx([]);
  const s = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(s.events, []);
  assertEquals(c.calls.length, 0);
  assertEquals((s.nextState as { floor: number }).floor, NOW);
});

test("new-contact: crawls sort=id with id=gt:<last id>, emits new contacts, retries idempotently", async () => {
  const s = await seed();
  const c1 = mockCtx([page([row(5), row(6)])]);
  const r1 = await trigger.poll!({ ...input, state: s.nextState }, c1.ctx);
  assertEquals(r1.events, [row(5), row(6)]);
  assertEquals(c1.calls[0].method, "GET");
  assertEquals(new URL(c1.calls[0].url).pathname, "/api/v2/contacts");
  assertEquals(q(c1.calls[0].url), { limit: "1000", sort: "id", id: "gt:0" });
  const again = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx([page([row(5), row(6)])]).ctx,
  );
  assertEquals(again, r1);
  const c2 = mockCtx([page([row(7)])]);
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
  assertEquals(r2.events, [row(7)]);
  assertEquals(q(c2.calls[0].url), { limit: "1000", sort: "id", id: "gt:6" });
});

test("new-contact: a window of MAX_PAGES + 1 full pages is drained across checks, none twice", async () => {
  const s = await seed();
  const pages = Array.from({ length: MAX_PAGES + 1 }, (_, p) => full(1 + p * 1000, AFTER));
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx(pages.slice(0, MAX_PAGES).map(page)).ctx,
  );
  assertEquals(r1.events.length, MAX_PAGES * 1000);
  assertEquals((r1.nextState as { cursor: number }).cursor, NOW);
  const c2 = mockCtx([page(pages[MAX_PAGES]), page([])]);
  clock.now = () => NOW + 600_000;
  try {
    const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
    assertEquals(r2.events.length, 1000);
    assertEquals(q(c2.calls[0].url).id, `gt:${MAX_PAGES * 1000}`);
    const ids = [...r1.events, ...r2.events].map((e) => (e as { id: number }).id);
    assertEquals(new Set(ids).size, (MAX_PAGES + 1) * 1000);
    assertEquals((r2.nextState as { cursor: number }).cursor, NOW + 600_000);
  } finally {
    clock.now = () => NOW;
  }
});

test("new-contact: contacts created before the seed never flood a later check", async () => {
  const s = await seed();
  const old = Array.from({ length: MAX_PAGES + 1 }, (_, p) => full(1 + p * 1000, BEFORE));
  const r1 = await trigger.poll!(
    { ...input, state: s.nextState },
    mockCtx(old.slice(0, MAX_PAGES).map(page)).ctx,
  );
  assertEquals(r1.events, []);
  const r2 = await trigger.poll!(
    { ...input, state: r1.nextState },
    mockCtx([page(old[MAX_PAGES]), page([])]).ctx,
  );
  assertEquals(r2.events, []);
  const r3 = await trigger.poll!(
    { ...input, state: r2.nextState },
    mockCtx([page([row(9999)])]).ctx,
  );
  assertEquals(r3.events, [row(9999)]);
});

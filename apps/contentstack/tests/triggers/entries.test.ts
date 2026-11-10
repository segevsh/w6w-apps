import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newEntry from "../../triggers/new-entry.ts";
import newOrUpdatedEntry from "../../triggers/new-or-updated-entry.ts";
import { clock, MAX_ITEMS } from "../../lib/since.ts";

// deno-lint-ignore no-explicit-any
type Trigger = any;
const input = { params: { contentTypeUid: "blog_post" }, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();
const entry = (n: number, createdMs: number, updatedMs = createdMs) => ({
  uid: `blt${n}`,
  title: `Entry ${n}`,
  created_at: iso(createdMs),
  updated_at: iso(updatedMs),
});
/** A window as the 100-per-page responses the `limit`/`skip` walk reads. */
const pagesOf = (rows: unknown[]) => {
  const out = [];
  for (let i = 0; i < rows.length; i += 100) {
    out.push({ body: { entries: rows.slice(i, i + 100) } });
  }
  if (rows.length % 100 === 0) out.push({ body: { entries: [] } });
  return out;
};

interface Case {
  name: string;
  trigger: Trigger;
  field: "created_at" | "updated_at";
  idOf: (e: { uid: string }) => string;
}
const cases: Case[] = [
  { name: "new-entry", trigger: newEntry, field: "created_at", idOf: (e) => e.uid },
  {
    name: "new-or-updated-entry",
    trigger: newOrUpdatedEntry,
    field: "updated_at",
    idOf: (e) => e.uid,
  },
];

for (const c of cases) {
  test(`${c.name}: seed reads nothing and emits nothing`, async () => {
    clock.now = () => NOW;
    const { ctx, calls } = mockCtx();
    const result = await c.trigger.poll!({ ...input, state: {} }, ctx);
    assertEquals(result.events, []);
    assertEquals(calls.length, 0);
    assertEquals((result.nextState as { floor?: number }).floor, NOW);
  });

  test(`${c.name}: sends the documented query filter and emits only new ones`, async () => {
    clock.now = () => NOW;
    const seed = await c.trigger.poll!({ ...input, state: {} }, mockCtx().ctx);
    clock.now = () => NOW + 300_000;
    const fresh = entry(2, NOW + 60_000);
    const run = mockCtx(pagesOf([fresh]));
    const first = await c.trigger.poll!({ ...input, state: seed.nextState }, run.ctx);
    const retry = await c.trigger.poll!(
      { ...input, state: seed.nextState },
      mockCtx(pagesOf([fresh])).ctx,
    );
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
    const url = new URL(run.calls[0].url);
    assertEquals(run.calls[0].method, "GET");
    assertEquals(url.pathname, "/v3/content_types/blog_post/entries");
    assertEquals(Object.fromEntries(url.searchParams), {
      // NOW - 120 s
      query: JSON.stringify({ [c.field]: { $gt: "2026-11-10T11:58:00.000Z" } }),
      limit: "100",
      skip: "0",
    });
  });

  test(`9.9 ${c.name}: entries that existed before the seed never emit, however many pages`, async () => {
    clock.now = () => NOW;
    const seed = await c.trigger.poll!({ ...input, state: {} }, mockCtx().ctx);
    clock.now = () => NOW + 300_000;
    const old = Array.from({ length: 250 }, (_, i) => entry(1000 + i, NOW - 3_600_000 - i * 1000));
    const check = await c.trigger.poll!(
      { ...input, state: seed.nextState },
      mockCtx(pagesOf(old)).ctx,
    );
    assertEquals(check.events, []);
    const created = entry(1, NOW + 120_000);
    const next = await c.trigger.poll!(
      { ...input, state: check.nextState },
      mockCtx(pagesOf([created, ...old])).ctx,
    );
    assertEquals(next.events, [created]);
  });

  test(`9.8 ${c.name}: a window larger than one check emits everything across checks, none twice`, async () => {
    clock.now = () => NOW;
    const seed = await c.trigger.poll!({ ...input, state: {} }, mockCtx().ctx);
    const total = MAX_ITEMS * 2 + 200;
    const window = Array.from({ length: total }, (_, i) => entry(i + 1, NOW + 1_000 + i * 1000));
    const newestFirst = [...window].reverse();
    let state = seed.nextState;
    const emitted: string[] = [];
    const cursors: number[] = [];
    for (let check = 1; check <= 3; check++) {
      clock.now = () => NOW + 300_000 * check;
      const result = await c.trigger.poll!({ ...input, state }, mockCtx(pagesOf(newestFirst)).ctx);
      emitted.push(...(result.events as { uid: string }[]).map(c.idOf));
      cursors.push((result.nextState as { cursor: number }).cursor);
      state = result.nextState;
    }
    assertEquals(emitted.length, total);
    assertEquals(new Set(emitted).size, total);
    assertEquals(emitted[0], "blt1");
    assertEquals(emitted[total - 1], `blt${total}`);
    assertEquals(cursors, [NOW, NOW, NOW + 900_000]);
  });

  test(`${c.name}: a missing content type is refused before any request`, async () => {
    clock.now = () => NOW;
    const seed = await c.trigger.poll!({ ...input, state: {} }, mockCtx().ctx);
    clock.now = () => NOW + 300_000;
    const { ctx, calls } = mockCtx();
    await assertRejects(
      async () =>
        await c.trigger.poll!(
          { params: {}, subscriptionId: "sub-1", state: seed.nextState },
          ctx,
        ),
      Error,
      "Content type UID",
    );
    assertEquals(calls.length, 0);
  });
}

test("new-entry: an entry created before the seed but edited after it is not new", async () => {
  clock.now = () => NOW;
  const seed = await newEntry.poll!({ ...input, state: {} }, mockCtx().ctx);
  clock.now = () => NOW + 300_000;
  const edited = entry(7, NOW - 86_400_000, NOW + 60_000);
  const check = await newEntry.poll!(
    { ...input, state: seed.nextState },
    mockCtx(pagesOf([edited])).ctx,
  );
  assertEquals(check.events, []);
});

test("new-or-updated-entry: an edited entry is a new event, an untouched one is not", async () => {
  clock.now = () => NOW;
  const seed = await newOrUpdatedEntry.poll!({ ...input, state: {} }, mockCtx().ctx);
  clock.now = () => NOW + 300_000;
  const created = entry(7, NOW + 10_000);
  const first = await newOrUpdatedEntry.poll!(
    { ...input, state: seed.nextState },
    mockCtx(pagesOf([created])).ctx,
  );
  assertEquals(first.events, [created]);
  clock.now = () => NOW + 600_000;
  const edited = entry(7, NOW + 10_000, NOW + 400_000);
  const second = await newOrUpdatedEntry.poll!(
    { ...input, state: first.nextState },
    mockCtx(pagesOf([edited])).ctx,
  );
  assertEquals(second.events, [edited]);
  clock.now = () => NOW + 900_000;
  const same = await newOrUpdatedEntry.poll!(
    { ...input, state: second.nextState },
    mockCtx(pagesOf([edited])).ctx,
  );
  assertEquals(same.events, []);
});

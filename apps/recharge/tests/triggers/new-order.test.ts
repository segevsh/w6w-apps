import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-order.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);
const NOW = 1_700_000_000_000;

async function atNow<T>(run: () => Promise<T>): Promise<T> {
  const real = Date.now;
  Date.now = () => NOW;
  try {
    return await run();
  } finally {
    Date.now = real;
  }
}

test("new-order: seeds, emits new rows, retries idempotently, and requests the literal window", async () => {
  const seed = ctx({ orders: [] });
  const seeded = await atNow(() => trigger.poll!({ ...input, state: {} }, seed.ctx));
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0); // seeding records the cursor, it does not read the feed

  const run = ctx({ orders: [{ id: 2, updated_at: "t1" }] });
  const first = await atNow(() => trigger.poll!({ ...input, state: seeded.nextState }, run.ctx));
  const retry = await atNow(() =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      ctx({ orders: [{ id: 2, updated_at: "t1" }] }).ctx,
    )
  );
  assertEquals(first.events.length, 1);
  assertEquals(first.events, [{ id: 2, updated_at: "t1" }]);
  assertEquals(retry, first);
  assertEquals(run.calls.length, 1);
  assertEquals(run.calls[0].method, "GET");
  assertEquals(
    run.calls[0].url,
    "https://api.rechargeapps.com/orders?limit=100&created_at_min=2023-11-14T22%3A11%3A20.000Z",
  );

  // a record already seen by the previous check is not emitted again
  const afterFirst = { ...first, nextState: first.nextState };
  const again = await atNow(() =>
    trigger.poll!(
      { ...input, state: afterFirst.nextState },
      ctx({ orders: [{ id: 2, updated_at: "t1" }] }).ctx,
    )
  );
  assertEquals(again.events, []);
});

test("new-order: a window over 3 pages is drained across successive checks, each item once", async () => {
  const all = Array.from({ length: 450 }, (_, i) => ({ id: i + 1, updated_at: "t" }));
  const c = {
    log() {},
    fetch: (u: string | URL | Request) => {
      const q = new URL(String(u)).searchParams;
      const off = Number(q.get("cursor") ?? 0);
      const orders = all.slice(off, off + 100);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            orders,
            next_cursor: off + 100 < all.length ? String(off + 100) : null,
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    },
  } as unknown as Parameters<NonNullable<typeof trigger.poll>>[1];
  let state: unknown = (await atNow(() => trigger.poll!({ ...input, state: {} }, c))).nextState;
  const emitted: string[] = [];
  for (let check = 0; check < 8; check++) {
    const r = await atNow(() => trigger.poll!({ ...input, state }, c));
    for (const e of r.events as Array<{ id: unknown }>) emitted.push(String(e.id));
    state = r.nextState;
  }
  assertEquals(emitted.length, 450);
  assertEquals(new Set(emitted).size, 450);
});

/** Stateful fake of `GET /orders`: `created_at_min` filter, ascending id, opaque `off:min` cursor. */
function fakeVendor(db: Array<{ id: number; created_at: string; updated_at: string }>) {
  return {
    log() {},
    fetch: (u: string | URL | Request) => {
      const q = new URL(String(u)).searchParams;
      const [off, min] = q.get("cursor")
        ? q.get("cursor")!.split("|")
        : ["0", q.get("created_at_min") ?? ""];
      const rows = db.filter((r) => !min || Date.parse(r.created_at) > Date.parse(min));
      const start = Number(off);
      const orders = rows.slice(start, start + 100);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            orders,
            next_cursor: start + 100 < rows.length ? `${start + 100}|${min}` : null,
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    },
  } as unknown as Parameters<NonNullable<typeof trigger.poll>>[1];
}
const at = async <T>(ms: number, run: () => Promise<T>): Promise<T> => {
  const real = Date.now;
  Date.now = () => ms;
  try {
    return await run();
  } finally {
    Date.now = real;
  }
};
const T0 = Date.parse("2026-11-09T12:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();
const row = (id: number, ms: number) => ({ id, created_at: iso(ms), updated_at: iso(ms) });

test("new-order: a window of MAX_PAGES + 1 full pages is drained over checks: each once, the cursor moves after", async () => {
  const db = Array.from({ length: 600 }, (_, i) => row(i + 1, T0 + 1000 + i));
  const c = fakeVendor(db);
  let state: unknown = (await at(T0, () => trigger.poll!({ ...input, state: {} }, c))).nextState;
  const emitted: string[] = [];
  const cursors: number[] = [];
  let t = T0 + 300_000;
  for (let check = 0; check < 4; check++, t += 300_000) {
    const r = await at(t, () => trigger.poll!({ ...input, state }, c));
    for (const e of r.events as Array<{ id: unknown }>) emitted.push(String(e.id));
    state = r.nextState;
    cursors.push((state as { cursor: number }).cursor);
  }
  assertEquals(emitted.length, 600);
  assertEquals(new Set(emitted).size, 600);
  assertEquals(cursors[0], T0); // held while the 6-page window was drained
  assertEquals(cursors[1] > T0, true);
});

test("new-order: orders from before the seed never flood a later check, however many pages", async () => {
  const db = Array.from({ length: 700 }, (_, i) => row(i + 1, T0 - 60_000 + i));
  const c = fakeVendor(db);
  const seeded = await at(T0, () => trigger.poll!({ ...input, state: {} }, c));
  assertEquals(seeded.events, []);
  let state = seeded.nextState;
  for (let check = 1; check <= 3; check++) {
    const r = await at(T0 + check * 300_000, () => trigger.poll!({ ...input, state }, c));
    assertEquals(r.events, []);
    state = r.nextState;
  }
  db.push(row(9001, T0 + 1_000_000));
  const r = await at(T0 + 1_200_000, () => trigger.poll!({ ...input, state }, c));
  assertEquals((r.events as Array<{ id: number }>).map((e) => e.id), [9001]);
});

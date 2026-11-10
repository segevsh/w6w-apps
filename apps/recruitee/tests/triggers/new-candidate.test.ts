import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-candidate.ts";

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

test("new-candidate: seeds, emits new rows, retries idempotently, and requests the literal window", async () => {
  const seed = ctx({ candidates: [] });
  const seeded = await atNow(() => trigger.poll!({ ...input, state: {} }, seed.ctx));
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0); // seeding records the cursor, it does not read the feed

  const run = ctx({ candidates: [{ id: 2, name: "Ada" }] });
  const first = await atNow(() => trigger.poll!({ ...input, state: seeded.nextState }, run.ctx));
  const retry = await atNow(() =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      ctx({ candidates: [{ id: 2, name: "Ada" }] }).ctx,
    )
  );
  assertEquals(first.events.length, 1);
  assertEquals(first.events, [{ id: 2, name: "Ada" }]);
  assertEquals(retry, first);
  assertEquals(run.calls.length, 1);
  assertEquals(run.calls[0].method, "GET");
  assertEquals(
    run.calls[0].url,
    "https://api.recruitee.com/c/123/candidates?limit=200&offset=0&created_after=2023-11-14T22%3A11%3A20.000Z",
  );

  // a record already seen by the previous check is not emitted again
  const afterFirst = { ...first, nextState: first.nextState };
  const again = await atNow(() =>
    trigger.poll!(
      { ...input, state: afterFirst.nextState },
      ctx({ candidates: [{ id: 2, name: "Ada" }] }).ctx,
    )
  );
  assertEquals(again.events, []);
});

test("new-candidate: a window over 3 pages is drained across successive checks, each item once", async () => {
  const all = Array.from(
    { length: 1300 },
    (_, i) => ({ id: i + 1, name: "n", created: NOW + 60_000 + i }),
  );
  const c = {
    ...ctx({}).ctx,
    fetch: (u: string | URL | Request) => {
      const q = new URL(String(u)).searchParams;
      const off = Number(q.get("offset") ?? 0), lim = Number(q.get("limit"));
      const after = Date.parse(q.get("created_after") ?? "");
      const candidates = all.filter((x) => x.created > after).slice(off, off + lim);
      return Promise.resolve(
        new Response(JSON.stringify({ candidates }), {
          headers: { "content-type": "application/json" },
        }),
      );
    },
  } as unknown as Parameters<NonNullable<typeof trigger.poll>>[1];
  let state: unknown = (await atNow(() => trigger.poll!({ ...input, state: {} }, c))).nextState;
  const emitted: string[] = [];
  for (let check = 0; check < 8; check++) {
    // the clock advances per check; the vendor honours created_after, so a finished window is not re-listed
    const real = Date.now;
    Date.now = () => NOW + 600_000 * (check + 1);
    const r = await trigger.poll!({ ...input, state }, c).finally(() => (Date.now = real));
    for (const e of r.events as Array<{ id: unknown }>) emitted.push(String(e.id));
    state = r.nextState;
  }
  assertEquals(emitted.length, 1300);
  assertEquals(new Set(emitted).size, 1300);
});

/** Stateful fake of `GET /candidates`: `created_after` filter, `limit` / `offset` paging. */
function fakeVendor(db: Array<{ id: number; created_at: string }>) {
  return {
    ...ctx({}).ctx,
    fetch: (u: string | URL | Request) => {
      const q = new URL(String(u)).searchParams;
      const after = q.get("created_after");
      const rows = db.filter((r) => !after || Date.parse(r.created_at) > Date.parse(after));
      const off = Number(q.get("offset") ?? 0), lim = Number(q.get("limit"));
      return Promise.resolve(
        new Response(JSON.stringify({ candidates: rows.slice(off, off + lim) }), {
          headers: { "content-type": "application/json" },
        }),
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
const row = (id: number, ms: number) => ({ id, created_at: iso(ms) });

test("new-candidate: a window of MAX_PAGES + 1 full pages is drained over checks: each once, the cursor moves after", async () => {
  const db = Array.from({ length: 1300 }, (_, i) => row(i + 1, T0 + 1000 + i));
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
  assertEquals(emitted.length, 1300);
  assertEquals(new Set(emitted).size, 1300);
  assertEquals(cursors[0], T0); // held while the 7-page window was drained
  assertEquals(cursors[1] > T0, true);
});

test("new-candidate: candidates from before the seed never flood a later check, however many pages", async () => {
  const db = Array.from({ length: 1300 }, (_, i) => row(i + 1, T0 - 60_000 + i));
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

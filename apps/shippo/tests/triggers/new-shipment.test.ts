import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import trigger from "../../triggers/new-shipment.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const rec = (n: number, ms: number) => ({
  object_id: `ship${n}`,
  object_created: new Date(ms).toISOString(),
});

type Result = { events: unknown[]; nextState: Record<string, unknown> };
const call = (state: unknown, ctx: unknown): Promise<Result> =>
  trigger.poll!({ params: {}, state, subscriptionId: "sub-1" }, ctx as never) as never;

/** A ctx whose fetch answers from `rows`: newest first, 1-based pages, `next` while more remain. */
function serve(rows: () => ReturnType<typeof rec>[], honourSince: boolean) {
  const mock = mockCtx();
  mock.ctx.fetch = ((input: RequestInfo | URL) => {
    const u = new URL(String(input));
    const since = Date.parse(u.searchParams.get("object_created_gte")!);
    const list = rows().filter((r) => !honourSince || Date.parse(r.object_created) >= since)
      .sort((a, b) => Date.parse(b.object_created) - Date.parse(a.object_created));
    const page = Number(u.searchParams.get("page"));
    const size = Number(u.searchParams.get("results"));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          next: list.length > page * size ? `baseurl?page=${page + 1}&results=${size}` : null,
          previous: null,
          results: list.slice((page - 1) * size, page * size),
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
  }) as typeof fetch;
  return mock.ctx;
}

async function withClock<T>(fn: () => Promise<T>): Promise<T> {
  const original = clock.now;
  try {
    return await fn();
  } finally {
    clock.now = original;
  }
}

test("new-shipment seeds without reading, emits a new shipment, retries, and requests the literal since filter", async () => {
  await withClock(async () => {
    clock.now = () => T0;
    const seed = mockCtx();
    const seeded = await call({}, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seeded.nextState.seeded, true);
    assertEquals(seeded.nextState.floor, T0);
    assertEquals(seed.calls.length, 0);

    clock.now = () => T0 + 60_000;
    const body = { next: null, previous: null, results: [rec(1, T0 + 30_000)] };
    const one = mockCtx([{ body }]);
    const first = await call(seeded.nextState, one.ctx);
    const retry = await call(seeded.nextState, mockCtx([{ body }]).ctx);
    assertEquals(first.events, body.results);
    assertEquals(retry, first);
    assertEquals(one.calls[0].method, "GET");
    assertEquals(
      one.calls[0].url,
      "https://api.goshippo.com/shipments?results=100&page=1&object_created_gte=2026-11-09T12%3A00%3A00.000Z",
    );
  });
});

test("new-shipment drains a window larger than maxPages across checks, none twice", async () => {
  await withClock(async () => {
    clock.now = () => T0;
    let state = (await call({}, mockCtx().ctx)).nextState;
    const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 + 1000 + i * 100));
    const emitted: string[] = [];
    let drainedAt = -1;
    for (let k = 0; k < 6 && drainedAt < 0; k++) {
      clock.now = () => T0 + 60_000 + k * 300_000;
      const r = await call(state, serve(() => rows, true));
      for (const e of r.events) emitted.push((e as { object_id: string }).object_id);
      state = r.nextState;
      if (k === 0) {
        assertEquals(r.events.length, 200);
        assertEquals(state.cursor, T0);
        assertEquals((state.resume as { pos: number }).pos, 3);
      }
      if (state.resume === undefined) drainedAt = k;
    }
    assertEquals(drainedAt, 1);
    assertEquals(emitted.length, 250);
    assertEquals(new Set(emitted).size, 250);
    // the cursor lands on the time the drained window was opened (check 0)
    assertEquals(state.cursor, T0 + 60_000);
  });
});

test("new-shipment never emits a shipment that existed before the seed", async () => {
  await withClock(async () => {
    clock.now = () => T0;
    let state = (await call({}, mockCtx().ctx)).nextState;
    assertEquals(Object.hasOwn(state, "floor"), true);
    const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 - 100_000 + i * 100));
    let now = T0 + 30_000;
    const run = async () => {
      clock.now = () => now;
      const r = await call(state, serve(() => rows, false));
      state = r.nextState;
      now += 300_000;
      return r;
    };
    for (let k = 0; k < 4; k++) assertEquals((await run()).events, []);
    rows.push(rec(999, T0 + 31_000));
    const got: unknown[] = [];
    for (let k = 0; k < 4; k++) got.push(...(await run()).events);
    assertEquals(got, [rec(999, T0 + 31_000)]);
  });
});

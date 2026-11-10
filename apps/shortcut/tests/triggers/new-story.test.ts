import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newStory from "../../triggers/new-story.ts";
import newOrUpdatedStory from "../../triggers/new-or-updated-story.ts";

const TRIGGERS = [
  [newStory, "created_at", "created_at_start"],
  [newOrUpdatedStory, "updated_at", "updated_at_start"],
] as const;
const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const rec = (id: number, ms: number) => ({ id, created_at: iso(ms), updated_at: iso(ms) });

type Result = { events: unknown[]; nextState: Record<string, unknown> };
const call = (
  trigger: (typeof TRIGGERS)[number][0],
  state: unknown,
  ctx: unknown,
): Promise<Result> =>
  trigger.poll!({ params: {}, state, subscriptionId: "sub-1" }, ctx as never) as never;

/** A ctx whose fetch answers the search from `rows` in a SCRAMBLED order (the trigger sorts). */
function serve(rows: () => ReturnType<typeof rec>[], honourSince: boolean) {
  const mock = mockCtx();
  mock.ctx.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, string>;
    const field = "created_at_start" in body ? "created_at" : "updated_at";
    const since = Date.parse(body.created_at_start ?? body.updated_at_start);
    const list = rows().filter((r) => !honourSince || Date.parse(r[field]) >= since)
      .sort((a, b) => (b.id % 7) - (a.id % 7) || b.id - a.id);
    return Promise.resolve(
      new Response(JSON.stringify(list), { headers: { "content-type": "application/json" } }),
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

test("Shortcut story triggers seed without reading, emit a new story, retry, and POST the literal since filter", async () => {
  await withClock(async () => {
    for (const [trigger, , filter] of TRIGGERS) {
      clock.now = () => T0;
      const seed = mockCtx();
      const seeded = await call(trigger, {}, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals(seeded.nextState.seeded, true);
      assertEquals(seeded.nextState.floor, T0);
      assertEquals(seed.calls.length, 0);

      clock.now = () => T0 + 60_000;
      const body = [rec(1, T0 + 30_000)];
      const one = mockCtx([{ body }]);
      const first = await call(trigger, seeded.nextState, one.ctx);
      const retry = await call(trigger, seeded.nextState, mockCtx([{ body }]).ctx);
      assertEquals(first.events, body);
      assertEquals(retry, first);
      assertEquals(one.calls[0].method, "POST");
      assertEquals(one.calls[0].url, "https://api.app.shortcut.com/api/v3/stories/search");
      assertEquals(one.calls[0].body, `{"${filter}":"2026-11-09T12:00:00.000Z"}`);
    }
  });
});

test("Shortcut story triggers drain a window larger than maxEvents across checks, none twice", async () => {
  await withClock(async () => {
    for (const [trigger] of TRIGGERS) {
      clock.now = () => T0;
      let state = (await call(trigger, {}, mockCtx().ctx)).nextState;
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 + 1000 + i * 100));
      const emitted: number[] = [];
      let drainedAt = -1;
      for (let k = 0; k < 6 && drainedAt < 0; k++) {
        clock.now = () => T0 + 60_000 + k * 300_000;
        const r = await call(trigger, state, serve(() => rows, true));
        for (const e of r.events) emitted.push((e as { id: number }).id);
        state = r.nextState;
        if (k === 0) {
          // oldest 100 first, window not drained: cursor unchanged, resume persisted
          assertEquals(emitted, rows.slice(0, 100).map((x) => x.id));
          assertEquals(state.cursor, T0);
        }
        if (state.resume === undefined) drainedAt = k;
      }
      assertEquals(drainedAt, 2);
      assertEquals(emitted, rows.map((x) => x.id));
      // the cursor lands on the time the drained window was opened (check 0)
      assertEquals(state.cursor, T0 + 60_000);
    }
  });
});

test("Shortcut story triggers never emit a story that existed before the seed", async () => {
  await withClock(async () => {
    for (const [trigger] of TRIGGERS) {
      clock.now = () => T0;
      let state = (await call(trigger, {}, mockCtx().ctx)).nextState;
      assertEquals(Object.hasOwn(state, "floor"), true);
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 - 100_000 + i * 100));
      let now = T0 + 30_000;
      const run = async () => {
        clock.now = () => now;
        const r = await call(trigger, state, serve(() => rows, false));
        state = r.nextState;
        now += 300_000;
        return r;
      };
      for (let k = 0; k < 3; k++) assertEquals((await run()).events, []);
      rows.push(rec(999, T0 + 31_000));
      const got: unknown[] = [];
      for (let k = 0; k < 3; k++) got.push(...(await run()).events);
      assertEquals(got, [rec(999, T0 + 31_000)]);
    }
  });
});

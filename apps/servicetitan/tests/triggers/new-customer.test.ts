import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newCustomer from "../../triggers/new-customer.ts";
import newOrUpdatedCustomer from "../../triggers/new-or-updated-customer.ts";

const TRIGGERS = [
  [newCustomer, "createdOnOrAfter"],
  [newOrUpdatedCustomer, "modifiedOnOrAfter"],
] as const;
const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const opts = { display: { tenantId: "42" } };
const rec = (id: number, ms: number) => ({
  id,
  createdOn: new Date(ms).toISOString(),
  modifiedOn: new Date(ms).toISOString(),
});

type Result = { events: unknown[]; nextState: Record<string, unknown> };
const call = (trigger: (typeof TRIGGERS)[number][0], state: unknown, ctx: never): Promise<Result> =>
  trigger.poll!({ params: {}, state, subscriptionId: "sub-1" }, ctx) as never;

/** A ctx whose fetch answers from `rows` (newest first, 1-based pages, `hasMore`). */
function serve(rows: () => ReturnType<typeof rec>[], honourSince: boolean) {
  const mock = mockCtx([], opts);
  mock.ctx.fetch = ((input: RequestInfo | URL) => {
    const u = new URL(String(input));
    const field = u.searchParams.has("createdOnOrAfter") ? "createdOn" : "modifiedOn";
    const since = Date.parse(
      u.searchParams.get("createdOnOrAfter") ?? u.searchParams.get("modifiedOnOrAfter")!,
    );
    const list = rows().filter((r) => !honourSince || Date.parse(r[field]) >= since)
      .sort((a, b) => Date.parse(b[field]) - Date.parse(a[field]));
    const page = Number(u.searchParams.get("page"));
    const size = Number(u.searchParams.get("pageSize"));
    return Promise.resolve(
      new Response(
        JSON.stringify({
          page,
          pageSize: size,
          hasMore: list.length > page * size,
          data: list.slice((page - 1) * size, page * size),
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
  }) as typeof fetch;
  return mock.ctx as never;
}

async function withClock<T>(fn: () => Promise<T>): Promise<T> {
  const original = clock.now;
  try {
    return await fn();
  } finally {
    clock.now = original;
  }
}

test("ServiceTitan customer triggers seed without reading, emit a new customer, retry, and request literal since filters", async () => {
  await withClock(async () => {
    for (const [trigger, filter] of TRIGGERS) {
      clock.now = () => T0;
      const seed = mockCtx([], opts);
      const seeded = await call(trigger, {}, seed.ctx as never);
      assertEquals(seeded.events, []);
      assertEquals(seeded.nextState.seeded, true);
      assertEquals(seeded.nextState.floor, T0);
      assertEquals(seed.calls.length, 0);

      clock.now = () => T0 + 60_000;
      const body = { data: [rec(1, T0 + 30_000)], hasMore: false };
      const one = mockCtx([{ body }], opts);
      const first = await call(trigger, seeded.nextState, one.ctx as never);
      const retry = await call(trigger, seeded.nextState, mockCtx([{ body }], opts).ctx as never);
      assertEquals(first.events, body.data);
      assertEquals(retry, first);
      assertEquals(one.calls[0].method, "GET");
      assertEquals(
        one.calls[0].url,
        `https://api.servicetitan.io/crm/v2/tenant/42/customers?${filter}=2026-11-09T12%3A00%3A00.000Z&page=1&pageSize=100`,
      );
    }
  });
});

test("ServiceTitan customer triggers drain a window larger than maxPages across checks, none twice", async () => {
  await withClock(async () => {
    for (const [trigger] of TRIGGERS) {
      clock.now = () => T0;
      let state = (await call(trigger, {}, mockCtx([], opts).ctx as never)).nextState;
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 + 1000 + i * 100));
      const emitted: number[] = [];
      let drainedAt = -1;
      for (let k = 0; k < 6 && drainedAt < 0; k++) {
        clock.now = () => T0 + 60_000 + k * 300_000;
        const r = await call(trigger, state, serve(() => rows, true));
        for (const e of r.events) emitted.push((e as { id: number }).id);
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
    }
  });
});

test("ServiceTitan customer triggers never emit a customer that existed before the seed", async () => {
  await withClock(async () => {
    for (const [trigger] of TRIGGERS) {
      clock.now = () => T0;
      let state = (await call(trigger, {}, mockCtx([], opts).ctx as never)).nextState;
      assertEquals(Object.hasOwn(state, "floor"), true);
      // 250 pre-seed customers (more than maxPages full pages); the fake ignores the since filter.
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 - 100_000 + i * 100));
      let now = T0 + 30_000;
      const run = async () => {
        clock.now = () => now;
        const r = await call(trigger, state, serve(() => rows, false));
        state = r.nextState;
        now += 300_000;
        return r;
      };
      for (let k = 0; k < 4; k++) assertEquals((await run()).events, []);
      rows.push(rec(999, T0 + 31_000));
      const got: unknown[] = [];
      for (let k = 0; k < 4; k++) got.push(...(await run()).events);
      assertEquals(got, [rec(999, T0 + 31_000)]);
    }
  });
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockServiceNowCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newTableRecord from "../../triggers/new-table-record.ts";
import newOrUpdatedTableRecord from "../../triggers/new-or-updated-table-record.ts";

const TRIGGERS = [
  [newTableRecord, "sys_created_on"],
  [newOrUpdatedTableRecord, "sys_updated_on"],
] as const;
const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const snTime = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
const rec = (n: number, ms: number) => ({
  sys_id: `id${n}`,
  sys_created_on: snTime(ms),
  sys_updated_on: snTime(ms),
});

type Call = { params: { table: string }; state: unknown; subscriptionId: string };
type Result = { events: unknown[]; nextState: Record<string, unknown> };

/** A ctx whose fetch answers from `rows`: ascending by the ORDERBY field, offset/limit honoured. */
function serve(rows: () => ReturnType<typeof rec>[], honourSince: boolean) {
  const mock = mockServiceNowCtx();
  const urls: string[] = [];
  mock.ctx.fetch = ((input: RequestInfo | URL) => {
    const u = new URL(String(input));
    urls.push(u.href);
    const q = u.searchParams.get("sysparm_query")!;
    const m = q.match(/^(sys_created_on|sys_updated_on)>=(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)\^/)!;
    const since = Date.parse(`${m[2].replace(" ", "T")}Z`);
    const field = m[1] as "sys_created_on" | "sys_updated_on";
    const at = (r: ReturnType<typeof rec>) => Date.parse(`${r[field].replace(" ", "T")}Z`);
    const list = rows().filter((r) => !honourSince || at(r) >= since).sort((a, b) => at(a) - at(b));
    const off = Number(u.searchParams.get("sysparm_offset"));
    const lim = Number(u.searchParams.get("sysparm_limit"));
    return Promise.resolve(
      new Response(JSON.stringify({ result: list.slice(off, off + lim) }), {
        headers: { "content-type": "application/json" },
      }),
    );
  }) as typeof fetch;
  return { ctx: mock.ctx, urls };
}

async function withClock<T>(fn: () => Promise<T>): Promise<T> {
  const original = clock.now;
  try {
    return await fn();
  } finally {
    clock.now = original;
  }
}

test("ServiceNow table triggers seed without reading, emit a new record, retry, and request literal ordered queries", async () => {
  await withClock(async () => {
    for (const [trigger, stamp] of TRIGGERS) {
      clock.now = () => T0;
      const seed = mockServiceNowCtx([]);
      const seeded = await trigger.poll!(
        { params: { table: "incident" }, state: {}, subscriptionId: "sub-1" },
        seed.ctx,
      );
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      assertEquals((seeded.nextState as { floor?: number }).floor, T0);
      assertEquals(seed.calls.length, 0);

      clock.now = () => T0 + 60_000;
      const call = { params: { table: "incident" }, state: seeded.nextState, subscriptionId: "s" };
      const body = { result: [rec(1, T0 + 30_000)] };
      const one = mockServiceNowCtx([{ body }]);
      const first = await trigger.poll!(call, one.ctx);
      const retry = await trigger.poll!(call, mockServiceNowCtx([{ body }]).ctx);
      assertEquals(first.events, body.result);
      assertEquals(retry, first);
      assertEquals(one.calls[0].method, "GET");
      assertEquals(
        one.calls[0].url,
        `https://acme.service-now.com/api/now/table/incident?sysparm_query=${stamp}%3E%3D2026-11-09+12%3A00%3A00%5EORDERBY${stamp}%5EORDERBYsys_id&sysparm_limit=100&sysparm_offset=0`,
      );
    }
  });
});

test("ServiceNow table triggers drain a window larger than maxPages across checks, none twice", async () => {
  await withClock(async () => {
    for (const [trigger] of TRIGGERS) {
      clock.now = () => T0;
      const call = (state: unknown, ctx: never): Promise<Result> =>
        trigger.poll!({ params: { table: "incident" }, state, subscriptionId: "s" }, ctx) as never;
      let state = (await call({}, mockServiceNowCtx([]).ctx as never)).nextState;
      // 250 records created after the seed, all inside one overlap window: 3 pages of 100.
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 + 1000 + i * 100));
      const emitted: string[] = [];
      let drainedAt = -1;
      for (let k = 0; k < 6 && drainedAt < 0; k++) {
        clock.now = () => T0 + 60_000 + k * 300_000;
        const s = serve(() => rows, true);
        const r = await call(state, s.ctx as never);
        for (const e of r.events) emitted.push((e as { sys_id: string }).sys_id);
        state = r.nextState;
        if (k === 0) {
          // 2 pages x 100 read, window not drained: cursor unchanged, resume persisted.
          assertEquals(r.events.length, 200);
          assertEquals(state.cursor, T0);
          assertEquals((state.resume as { pos: number }).pos, 200);
        }
        if (state.resume === undefined) drainedAt = k;
      }
      assertEquals(drainedAt, 1);
      assertEquals(emitted.length, 250);
      assertEquals(new Set(emitted).size, 250);
      // the cursor lands on the time the drained window was opened (check 0), not on a later check
      assertEquals(state.cursor, T0 + 60_000);
    }
  });
});

test("ServiceNow table triggers never emit a record that existed before the seed", async () => {
  await withClock(async () => {
    for (const [trigger] of TRIGGERS) {
      clock.now = () => T0;
      const call = (state: unknown, ctx: never): Promise<Result> =>
        trigger.poll!({ params: { table: "incident" }, state, subscriptionId: "s" }, ctx) as never;
      let state = (await call({}, mockServiceNowCtx([]).ctx as never)).nextState;
      assertEquals(Object.hasOwn(state, "floor"), true);
      // 250 pre-seed records (more than maxPages full pages); the fake ignores the since filter.
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 - 100_000 + i * 100));
      let now = T0 + 30_000;
      const run = async () => {
        clock.now = () => now;
        const r = await call(state, serve(() => rows, false).ctx as never);
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

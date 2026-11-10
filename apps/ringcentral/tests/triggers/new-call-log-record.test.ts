import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { listEnvelope, mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newCallLogRecord from "../../triggers/new-call-log-record.ts";
import newMessage from "../../triggers/new-message.ts";

const TRIGGERS = [
  [
    newCallLogRecord,
    "startTime",
    "https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~/call-log?dateFrom=2026-11-09T12%3A00%3A00.000Z&page=1&perPage=100",
  ],
  [
    newMessage,
    "creationTime",
    "https://platform.ringcentral.com/restapi/v1.0/account/~/extension/~/message-store?availability=Alive&dateFrom=2026-11-09T12%3A00%3A00.000Z&page=1&perPage=100",
  ],
] as const;
const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();
const rec = (n: number, ms: number) => ({ id: `r${n}`, startTime: iso(ms), creationTime: iso(ms) });

type Result = { events: unknown[]; nextState: Record<string, unknown> };
const call = (
  trigger: (typeof TRIGGERS)[number][0],
  state: unknown,
  ctx: unknown,
): Promise<Result> =>
  trigger.poll!({ params: {}, state, subscriptionId: "sub-1" }, ctx as never) as never;
const envelope = (records: unknown[], more: boolean) =>
  listEnvelope(records, { navigation: more ? { nextPage: { uri: "https://x/next" } } : {} });

/** A ctx whose fetch answers from `rows`: newest first, 1-based pages, `navigation.nextPage`. */
function serve(
  rows: () => ReturnType<typeof rec>[],
  field: "startTime" | "creationTime",
  honourSince: boolean,
) {
  const mock = mockCtx();
  mock.ctx.fetch = ((input: RequestInfo | URL) => {
    const u = new URL(String(input));
    const since = Date.parse(u.searchParams.get("dateFrom")!);
    const list = rows().filter((r) => !honourSince || Date.parse(r[field]) >= since)
      .sort((a, b) => Date.parse(b[field]) - Date.parse(a[field]));
    const page = Number(u.searchParams.get("page"));
    const size = Number(u.searchParams.get("perPage"));
    return Promise.resolve(
      new Response(
        JSON.stringify(
          envelope(list.slice((page - 1) * size, page * size), list.length > page * size),
        ),
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

test("RingCentral triggers seed without reading, emit a new record, retry, and request literal dateFrom queries", async () => {
  await withClock(async () => {
    for (const [trigger, , url] of TRIGGERS) {
      clock.now = () => T0;
      const seed = mockCtx();
      const seeded = await call(trigger, {}, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals(seeded.nextState.seeded, true);
      assertEquals(seeded.nextState.floor, T0);
      assertEquals(seed.calls.length, 0);

      clock.now = () => T0 + 60_000;
      const body = envelope([rec(1, T0 + 30_000)], false);
      const one = mockCtx([{ body }]);
      const first = await call(trigger, seeded.nextState, one.ctx);
      const retry = await call(trigger, seeded.nextState, mockCtx([{ body }]).ctx);
      assertEquals(first.events, [rec(1, T0 + 30_000)]);
      assertEquals(retry, first);
      assertEquals(one.calls[0].method, "GET");
      // the window opens at the seed floor (the overlap would reach before it)
      assertEquals(one.calls[0].url, url);
    }
  });
});

test("RingCentral triggers drain a window larger than maxPages across checks, none twice", async () => {
  await withClock(async () => {
    for (const [trigger, field] of TRIGGERS) {
      clock.now = () => T0;
      let state = (await call(trigger, {}, mockCtx().ctx)).nextState;
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 + 1000 + i * 100));
      const emitted: string[] = [];
      let drainedAt = -1;
      for (let k = 0; k < 6 && drainedAt < 0; k++) {
        clock.now = () => T0 + 60_000 + k * 300_000;
        const r = await call(trigger, state, serve(() => rows, field, true));
        for (const e of r.events) emitted.push((e as { id: string }).id);
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

test("RingCentral triggers never emit a record that existed before the seed", async () => {
  await withClock(async () => {
    for (const [trigger, field] of TRIGGERS) {
      clock.now = () => T0;
      let state = (await call(trigger, {}, mockCtx().ctx)).nextState;
      assertEquals(Object.hasOwn(state, "floor"), true);
      const rows = Array.from({ length: 250 }, (_, i) => rec(i + 1, T0 - 100_000 + i * 100));
      let now = T0 + 30_000;
      const run = async () => {
        clock.now = () => now;
        const r = await call(trigger, state, serve(() => rows, field, false));
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

test("RingCentral triggers re-read a literal overlap before the cursor: 30 minutes of call log, 2 of messages", async () => {
  await withClock(async () => {
    const state = {
      v: 1,
      kind: "ids",
      seeded: true,
      ids: [],
      floor: T0,
      cursor: T0 + 3_600_000,
    };
    clock.now = () => T0 + 3_900_000;
    const calls = mockCtx([{ body: envelope([], false) }]);
    await call(newCallLogRecord, state, calls.ctx);
    assertEquals(
      calls.calls[0].url.includes("dateFrom=2026-11-09T12%3A30%3A00.000Z&"),
      true,
    );
    const msgs = mockCtx([{ body: envelope([], false) }]);
    await call(newMessage, state, msgs.ctx);
    assertEquals(
      msgs.calls[0].url.includes("dateFrom=2026-11-09T12%3A58%3A00.000Z&"),
      true,
    );
  });
});

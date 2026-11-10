import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newTimeActivity from "../../triggers/new-time-activity.ts";
import { clock, MAX_ITEMS } from "../../lib/since.ts";

const input = { params: { timeClockId: 301 }, subscriptionId: "sub-1" };
const NOW = Date.UTC(2026, 10, 10, 12, 0, 0);
const sec = (ms: number) => Math.floor(ms / 1000);
const shift = (id: string, createdMs: number, userId = 9001) => ({
  userId,
  type: "shift",
  id,
  start: { timestamp: sec(createdMs - 3_600_000), timezone: "America/New_York" },
  end: null,
  createdAt: sec(createdMs),
  modifiedAt: sec(createdMs),
});
/** The grouped response for a list of flat activities (one user group per user id). */
const reply = (rows: ReturnType<typeof shift>[]) => {
  const byUser = new Map<number, unknown[]>();
  for (const { userId, type: _type, ...rest } of rows) {
    byUser.set(userId, [...(byUser.get(userId) ?? []), rest]);
  }
  return {
    body: {
      requestId: "r1",
      data: {
        timeActivitiesByUsers: [...byUser].map(([userId, shifts]) => ({
          userId,
          shifts,
          manualBreaks: [],
          timeOffs: null,
        })),
      },
    },
  };
};
const ev = (row: ReturnType<typeof shift>) => row;

test("new-time-activity: seed reads nothing and emits nothing", async () => {
  clock.now = () => NOW;
  const { ctx, calls } = mockCtx();
  const result = await newTimeActivity.poll!({ ...input, state: {} }, ctx);
  assertEquals(result.events, []);
  assertEquals(calls.length, 0);
  assertEquals((result.nextState as { floor?: number }).floor, NOW);
});

test("new-time-activity: one dated request for the clock, emits only the new activity, retries idempotently", async () => {
  clock.now = () => NOW;
  const seed = await newTimeActivity.poll!({ ...input, state: {} }, mockCtx().ctx);
  clock.now = () => NOW + 300_000;
  const fresh = shift("a2", NOW + 60_000);
  const run = mockCtx([reply([fresh])]);
  const first = await newTimeActivity.poll!({ ...input, state: seed.nextState }, run.ctx);
  const retry = await newTimeActivity.poll!(
    { ...input, state: seed.nextState },
    mockCtx([reply([fresh])]).ctx,
  );
  assertEquals(first.events, [ev(fresh)]);
  assertEquals(retry, first);
  assertEquals(run.calls.length, 1);
  const url = new URL(run.calls[0].url);
  assertEquals(run.calls[0].method, "GET");
  assertEquals(url.pathname, "/time-clock/v1/time-clocks/301/time-activities");
  // window: look-back 2026-11-10T11:58Z minus 2 days, to the day after the check
  assertEquals(Object.fromEntries(url.searchParams), {
    startDate: "2026-11-08",
    endDate: "2026-11-11",
  });
  const again = await newTimeActivity.poll!(
    { ...input, state: first.nextState },
    mockCtx([reply([fresh])]).ctx,
  );
  assertEquals(again.events, []);
});

test("new-time-activity: manual breaks and time off are events too, keyed by kind", async () => {
  clock.now = () => NOW;
  const seed = await newTimeActivity.poll!({ ...input, state: {} }, mockCtx().ctx);
  clock.now = () => NOW + 300_000;
  const at = sec(NOW + 60_000);
  const body = {
    data: {
      timeActivitiesByUsers: [{
        userId: 9001,
        shifts: [],
        manualBreaks: [{ id: "x1", start: { timestamp: at }, createdAt: at }],
        timeOffs: [{ id: "x1", start: { timestamp: at }, createdAt: at }],
      }],
    },
  };
  const result = await newTimeActivity.poll!(
    { ...input, state: seed.nextState },
    mockCtx([{ body }]).ctx,
  );
  assertEquals(
    (result.events as { type: string }[]).map((e) => e.type).sort(),
    ["manual_break", "time_off"],
  );
});

test("9.9 new-time-activity: activities that existed before the seed never emit, even without createdAt", async () => {
  clock.now = () => NOW;
  const seed = await newTimeActivity.poll!({ ...input, state: {} }, mockCtx().ctx);
  clock.now = () => NOW + 300_000;
  const old = Array.from({ length: 120 }, (_, i) => shift(`o${i}`, NOW - 3_600_000 - i * 1000));
  const noStamp = {
    body: {
      data: {
        timeActivitiesByUsers: [{
          userId: 1,
          shifts: [{ id: "ns", start: { timestamp: sec(NOW - 7_200_000) }, createdAt: null }],
          manualBreaks: [],
        }],
      },
    },
  };
  const check = await newTimeActivity.poll!(
    { ...input, state: seed.nextState },
    mockCtx([reply(old)]).ctx,
  );
  assertEquals(check.events, []);
  const noStampCheck = await newTimeActivity.poll!(
    { ...input, state: check.nextState },
    mockCtx([noStamp]).ctx,
  );
  assertEquals(noStampCheck.events, []);
  const created = shift("n1", NOW + 120_000);
  const next = await newTimeActivity.poll!(
    { ...input, state: noStampCheck.nextState },
    mockCtx([reply([...old, created])]).ctx,
  );
  assertEquals(next.events, [ev(created)]);
});

test("9.8 new-time-activity: a window larger than one check emits everything across checks, none twice", async () => {
  clock.now = () => NOW;
  const seed = await newTimeActivity.poll!({ ...input, state: {} }, mockCtx().ctx);
  const total = MAX_ITEMS * 2 + 200;
  const window = Array.from(
    { length: total },
    (_, i) => shift(`s${i + 1}`, NOW + 1_000 + i * 1000),
  );
  let state = seed.nextState;
  const emitted: string[] = [];
  const cursors: number[] = [];
  for (let check = 1; check <= 3; check++) {
    clock.now = () => NOW + 300_000 * check;
    const result = await newTimeActivity.poll!({ ...input, state }, mockCtx([reply(window)]).ctx);
    emitted.push(...(result.events as { id: string }[]).map((e) => e.id));
    cursors.push((result.nextState as { cursor: number }).cursor);
    state = result.nextState;
  }
  assertEquals(emitted.length, total);
  assertEquals(new Set(emitted).size, total);
  assertEquals(emitted[0], "s1");
  assertEquals(emitted[total - 1], `s${total}`);
  assertEquals(cursors, [NOW, NOW, NOW + 900_000]);
});

test("new-time-activity: a missing time clock is refused before any request", async () => {
  clock.now = () => NOW;
  const seed = await newTimeActivity.poll!({ ...input, state: {} }, mockCtx().ctx);
  clock.now = () => NOW + 300_000;
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await newTimeActivity.poll!(
        { params: {}, subscriptionId: "sub-1", state: seed.nextState },
        ctx,
      ),
    Error,
    "Time Clock",
  );
  assertEquals(calls.length, 0);
});

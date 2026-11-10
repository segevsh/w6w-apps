import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-reservation.ts";
import { clock } from "../../lib/triggers.ts";

clock.now = () => Date.parse("2026-11-09T12:00:00Z");

const input = { params: {}, subscriptionId: "sub-1" };
const res = (reservationID: string, dateModified = "2026-11-09 12:00:30") => ({
  reservationID,
  dateModified,
});
const ctx = (items: unknown[]) => mockCtx([{ body: envelope(items, { count: items.length }) }]);
const URL_ =
  "https://api.cloudbeds.com/api/v1.3/getReservations?modifiedFrom=2026-11-09+11%3A58%3A00&pageNumber=1&pageSize=100";

test("new-or-updated-reservation: seeds without flooding and sends the modifiedFrom filter", async () => {
  const seed = ctx([res("r1")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, URL_);
});

test("new-or-updated-reservation: emits only the new reservation", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([res("r1")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([res("r2"), res("r1")]).ctx,
  );
  assertEquals(result.events, [res("r2")]);
});

test("new-or-updated-reservation: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([res("r1")]).ctx);
  const page = [res("r2"), res("r1")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-or-updated-reservation: the next check filters from cursor minus overlap", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([res("r1")]).ctx);
  clock.now = () => Date.parse("2026-11-09T12:10:00Z");
  const next = ctx([]);
  await trigger.poll!({ ...input, state: seeded.nextState }, next.ctx);
  clock.now = () => Date.parse("2026-11-09T12:00:00Z");
  assertEquals(next.calls[0].url, URL_);
});

test("new-or-updated-reservation: an edit to a seen reservation is an event", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    ctx([res("r1", "2026-11-09 10:00:00")]).ctx,
  );
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([res("r1", "2026-11-09 12:01:00")]).ctx,
  );
  assertEquals(edited.events, [res("r1", "2026-11-09 12:01:00")]);
  const quiet = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([res("r1", "2026-11-09 10:00:00")]).ctx,
  );
  assertEquals(quiet.events, []);
});

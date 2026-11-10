import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-message.ts";
import { clock } from "../../lib/since-poll.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z"); // the seed check
const T1 = Date.parse("2026-11-09T12:10:00.000Z"); // the next check
const input = { params: {}, subscriptionId: "sub-1" };
const msg = (n: number) => ({ messageId: `m${n}`, dateUpdated: "2026-11-09T12:05:00.000Z" });
const rows = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => msg(from + i));
const body = (items: unknown[], nextKey?: string) => ({
  messageList: items,
  ...(nextKey ? { nextKey } : {}),
});
const ids = (events: unknown[]) =>
  events.map((e) => (e as { messageId: string }).messageId).sort((a, b) =>
    Number(a.slice(1)) - Number(b.slice(1))
  );
const at = (ms: number) => {
  clock.now = () => ms;
};
const seedState = async () => {
  at(T0);
  const seed = mockCtx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 0); // the seed reads nothing
  return seeded.nextState;
};

test("new-or-updated-message seeds without a request, emits the new row, retries identically", async () => {
  const state = await seedState();
  at(T1);
  const run = () => trigger.poll!({ ...input, state }, mockCtx([{ body: body([msg(7)]) }]).ctx);
  const first = await run();
  assertEquals(ids(first.events), ["m7"]);
  assertEquals(await run(), first);
});

test("new-or-updated-message requests the literal UPDATED window", async () => {
  const state = await seedState();
  at(T1);
  const m = mockCtx([{ body: body([]) }]);
  await trigger.poll!({ ...input, state }, m.ctx);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.solapi.com/messages/v4/list?startDate=2026-11-09T12%3A00%3A00.000Z" +
      "&endDate=2026-11-09T12%3A10%3A00.000Z&dateType=UPDATED&limit=100",
  );
});

test("new-or-updated-message drains 2 full pages across checks via nextKey: each row once, cursor after", async () => {
  const state = await seedState();
  at(T1);
  const r1 = await trigger.poll!(
    { ...input, state },
    mockCtx([{ body: body(rows(1, 100), "k2") }]).ctx,
  );
  assertEquals(ids(r1.events).length, 100);
  const s1 = r1.nextState as { cursor: number; resume?: { pos: string } };
  assertEquals(s1.cursor, T0);
  assertEquals(s1.resume?.pos, "k2");
  at(T1 + 300_000);
  const c2 = mockCtx([{ body: body(rows(101, 200)) }]);
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
  assertEquals(ids(r2.events), rows(101, 200).map((r) => r.messageId));
  assertEquals(
    c2.calls[0].url,
    "https://api.solapi.com/messages/v4/list?startDate=2026-11-09T12%3A00%3A00.000Z" +
      "&endDate=2026-11-09T12%3A10%3A00.000Z&dateType=UPDATED&limit=100&startKey=k2",
  );
  assertEquals((r2.nextState as { cursor: number }).cursor, T1);
  assertEquals((r2.nextState as { resume?: unknown }).resume, undefined);
});

test("new-or-updated-message drops rows created before the seed even inside the window", async () => {
  const state = await seedState();
  at(T1);
  const old = { messageId: "old", dateUpdated: "2026-11-09T11:59:59.000Z" };
  const r = await trigger.poll!(
    { ...input, state },
    mockCtx([{ body: body([old, msg(8)]) }]).ctx,
  );
  assertEquals(ids(r.events), ["m8"]);
});

test("new-or-updated-message emits a status change (same messageId, new dateUpdated)", async () => {
  const state = await seedState();
  at(T1);
  const before = { messageId: "m5", dateUpdated: "2026-11-09T12:05:00.000Z" };
  const first = await trigger.poll!(
    { ...input, state },
    mockCtx([{ body: body([before]) }]).ctx,
  );
  assertEquals(first.events, [before]);
  at(T1 + 300_000);
  const after = { messageId: "m5", dateUpdated: "2026-11-09T12:12:00.000Z" };
  const second = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: body([after, before]) }]).ctx,
  );
  assertEquals(second.events, [after]);
});

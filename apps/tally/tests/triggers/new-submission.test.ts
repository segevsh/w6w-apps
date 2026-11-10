import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-submission.ts";
import { clock, MAX_PAGES, OVERLAP_MS, PAGE_SIZE } from "../../lib/triggers.ts";

const T0 = Date.parse("2026-11-09T12:00:00.000Z");
const input = { params: { formId: "form-1" }, subscriptionId: "sub-1" };
const item = (
  id: number,
  ms: number,
) => ({
  id: `sub-${id}`,
  formId: "form-1",
  submittedAt: new Date(ms).toISOString(),
  isCompleted: true,
});
const body = (
  items: unknown[],
  total: number,
  page: number,
) => ({
  submissions: items,
  questions: [],
  page,
  limit: PAGE_SIZE,
  hasMore: page * PAGE_SIZE < total,
});
const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});
const at = (ms: number) => {
  clock.now = () => ms;
};

test("new-submission: first check seeds without reading or emitting", async () => {
  at(T0);
  const m = mockCtx([]);
  const seeded = await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals(m.calls.length, 0);
  const s = seeded.nextState as { seeded?: boolean; floor?: number; cursor?: number };
  assertEquals(s.seeded, true);
  assertEquals(s.floor, T0);
  assertEquals(s.cursor, T0);
});

test("new-submission: a record created after the seed is emitted, an older one is not", async () => {
  at(T0);
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  at(T0 + 300_000);
  const fresh = item(2, T0 + 10_000);
  const old = item(1, T0 - 60_000);
  const m = mockCtx([{ body: body([fresh, old], 2, 1) }]);
  const next = await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(next.events, [fresh]);
  assertEquals((next.nextState as { cursor: number }).cursor, T0 + 300_000);
});

test("new-submission: the same state and response give an identical result", async () => {
  at(T0);
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  at(T0 + 300_000);
  const page = body([item(3, T0 + 20_000), item(2, T0 + 10_000)], 2, 1);
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  const again = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(first.events.length, 2);
  assertEquals(again, first);
});

test("new-submission: a record seen on an earlier check is not emitted twice", async () => {
  at(T0);
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  at(T0 + 300_000);
  const a = item(2, T0 + 10_000);
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: body([a], 1, 1) }]).ctx,
  );
  at(T0 + 600_000);
  const second = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: body([item(3, T0 + 400_000), a], 2, 1) }]).ctx,
  );
  assertEquals(first.events, [a]);
  assertEquals(second.events, [item(3, T0 + 400_000)]);
});

test("new-submission: sends the list request with the since filter (cursor minus the overlap)", async () => {
  at(T0);
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  at(T0 + 300_000);
  const m = mockCtx([{ body: body([], 0, 1) }]);
  await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.tally.so/forms/form-1/submissions?page=1&limit=100&filter=completed&startDate=2026-11-09T11%3A58%3A00.000Z",
  );
});

test("new-submission: a window of more than MAX_PAGES full pages is drained across checks, none twice", async () => {
  at(T0);
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  const pages = MAX_PAGES + 1;
  const all = Array.from({ length: pages * PAGE_SIZE }, (_, i) => item(i + 1, T0 + 1_000 + i));
  const pageOf = (p: number) => all.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  const total = all.length;

  at(T0 + 300_000);
  const firstMock = mockCtx(
    Array.from({ length: MAX_PAGES }, (_, i) => ({ body: body(pageOf(i + 1), total, i + 1) })),
  );
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, firstMock.ctx);
  assertEquals(firstMock.calls.length, MAX_PAGES);
  const s1 = first.nextState as { cursor: number; resume?: { page: number } };
  assertEquals(s1.cursor, T0);
  assertEquals(s1.resume?.page, MAX_PAGES + 1);

  at(T0 + 600_000);
  const secondMock = mockCtx([{ body: body(pageOf(pages), total, pages) }]);
  const second = await trigger.poll!({ ...input, state: first.nextState }, secondMock.ctx);
  assertEquals(secondMock.calls.length, 1);
  assertEquals(secondMock.calls[0].url.includes("page=4"), true);
  const s2 = second.nextState as { cursor: number; resume?: unknown };
  assertEquals(s2.cursor, T0 + 300_000);
  assertEquals(s2.resume, undefined);

  const emitted = [...first.events, ...second.events];
  assertEquals(emitted.length, all.length);
  assertEquals(new Set(emitted.map((e) => JSON.stringify(e))).size, all.length);
});

test("new-submission: records created before the seed are never emitted, however many pages", async () => {
  at(T0);
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([]).ctx);
  const pages = MAX_PAGES + 1;
  const before = Array.from({ length: pages * PAGE_SIZE }, (_, i) => item(i + 1, T0 - 90_000 + i));
  const pageOf = (p: number) => before.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);

  at(T0 + 300_000);
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx(
      Array.from({ length: MAX_PAGES }, (_, i) => ({
        body: body(pageOf(i + 1), before.length, i + 1),
      })),
    ).ctx,
  );
  at(T0 + 600_000);
  const second = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: body(pageOf(pages), before.length, pages) }]).ctx,
  );
  assertEquals(first.events, []);
  assertEquals(second.events, []);

  at(T0 + 900_000);
  const created = item(9999, T0 + 700_000);
  const third = await trigger.poll!(
    { ...input, state: second.nextState },
    mockCtx([{ body: body([created], 1, 1) }]).ctx,
  );
  assertEquals(third.events, [created]);
});

test("new-submission: the overlap is two minutes", () => {
  assertEquals(OVERLAP_MS, 120_000);
});

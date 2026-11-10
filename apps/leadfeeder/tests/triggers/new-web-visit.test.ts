import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-web-visit.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

// 2026-11-10T12:00:00Z
const NOW = Date.parse("2026-11-10T12:00:00Z");
const input = { params: { accountId: "A1" }, subscriptionId: "sub-1" };
const visit = (id: string, startedAt: string) => ({
  id,
  type: "web_visit",
  attributes: { started_at: startedAt },
  relationships: {},
});
const reply = (items: unknown[], pageNum = 1, pageCount = 1) => ({
  body: {
    data: items,
    meta: {
      request_id: "r1",
      pagination: { page_num: pageNum, page_count: pageCount, total_count: items.length },
    },
  },
});
const seedState = async () => {
  clock.now = () => NOW;
  const seed = mockCtx();
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls.length, 0); // the seed reads nothing
  return seeded.nextState;
};

test("new-web-visit: sends the literal dated POST, emits the new visit, retries idempotently", async () => {
  const state = await seedState();
  clock.now = () => NOW + 600_000; // 12:10 the same day
  const page = [visit("v2", "2026-11-10T12:05:00.000Z")];
  const mock = mockCtx([reply(page)]);
  const first = await trigger.poll!({ ...input, state }, mock.ctx);
  assertEquals(first.events, page);
  assertEquals(mock.calls.length, 1);
  assertEquals(mock.calls[0].method, "POST");
  assertEquals(
    decodeURIComponent(mock.calls[0].url),
    "https://api.leadfeeder.com/v1/web-visits?account_id=A1&page[num]=1&page[size]=100",
  );
  assertEquals(JSON.parse(mock.calls[0].body ?? "{}"), {
    start_date: "2026-11-10",
    end_date: "2026-11-10",
  });
  // The same check again from the same stored state yields the same result.
  const retry = await trigger.poll!({ ...input, state }, mockCtx([reply(page)]).ctx);
  assertEquals(retry, first);
  // A later check that re-reads the same visit (overlap) emits nothing.
  const again = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([reply(page)]).ctx,
  );
  assertEquals(again.events, []);
});

test("new-web-visit: the window starts at the day of cursor minus the overlap", async () => {
  clock.now = () => Date.parse("2026-11-10T00:01:00Z");
  const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx().ctx);
  clock.now = () => Date.parse("2026-11-10T00:02:00Z");
  const mock = mockCtx([reply([])]);
  await trigger.poll!({ ...input, state: seeded.nextState }, mock.ctx);
  // cursor 00:01:00 minus 120 s falls on the previous UTC day.
  assertEquals(JSON.parse(mock.calls[0].body ?? "{}"), {
    start_date: "2026-11-09",
    end_date: "2026-11-10",
  });
});

test("new-web-visit: a visit that started before the seed floor is never emitted", async () => {
  const state = await seedState();
  clock.now = () => NOW + 600_000;
  const old = visit("v0", "2026-11-10T08:00:00.000Z"); // same day, before the seed at 12:00
  const fresh = visit("v3", "2026-11-10T12:05:00.000Z");
  const out = await trigger.poll!({ ...input, state }, mockCtx([reply([old, fresh])]).ctx);
  assertEquals(out.events, [fresh]);
});

test("new-web-visit: a multi-page window is drained across checks through resume, cursor held", async () => {
  const state = await seedState();
  clock.now = () => NOW + 600_000;
  const a = visit("a", "2026-11-10T12:01:00.000Z");
  const b = visit("b", "2026-11-10T12:02:00.000Z");
  const m1 = mockCtx([reply([a], 1, 2)]);
  const one = await trigger.poll!({ ...input, state }, m1.ctx);
  assertEquals(one.events, [a]);
  const s1 = one.nextState as { cursor: number; resume?: { page: number } };
  assertEquals(s1.cursor, NOW); // not advanced while pages remain
  assertEquals(s1.resume?.page, 2);
  clock.now = () => NOW + 900_000;
  const m2 = mockCtx([reply([b], 2, 2)]);
  const two = await trigger.poll!({ ...input, state: one.nextState }, m2.ctx);
  assertEquals(two.events, [b]);
  assertEquals(
    decodeURIComponent(m2.calls[0].url),
    "https://api.leadfeeder.com/v1/web-visits?account_id=A1&page[num]=2&page[size]=100",
  );
  // The resumed window keeps its original dates.
  assertEquals(JSON.parse(m2.calls[0].body ?? "{}"), {
    start_date: "2026-11-10",
    end_date: "2026-11-10",
  });
  const s2 = two.nextState as { cursor: number; resume?: unknown };
  assertEquals(s2.cursor, NOW + 600_000); // advanced to the window-open time
  assertEquals(s2.resume, undefined);
});

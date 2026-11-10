import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger, { clock } from "../../triggers/new-chat.ts";

// 2026-11-09T12:00:00Z
const SEED_AT = 1794225600000;
const input = { params: {}, subscriptionId: "sub-1" };

/** A chat created `createdMinAgo` minutes before the seed (negative = after), last message `n` s ago. */
const chat = (id: string, createdOffsetMs: number, lastModifiedMs: number) => ({
  chat_id: id,
  name: `Chat ${id}`,
  creation_time: new Date(SEED_AT + createdOffsetMs).toISOString(),
  last_modified_time: new Date(lastModifiedMs).toISOString(),
});
const old = (id: string, lastModifiedMs: number) => chat(id, -86_400_000, lastModifiedMs);
const fresh = (id: string, lastModifiedMs: number) => chat(id, 60_000, lastModifiedMs);
const page = (...pages: unknown[][]) => mockCtx(pages.map((chats) => ({ body: { chats } })));
const seededState = {
  v: 1,
  kind: "ids",
  seeded: true,
  ids: [],
  cursor: SEED_AT,
  floor: SEED_AT,
};

test("new-chat: the first check reads nothing, emits nothing and records the seed time", async () => {
  clock.now = () => SEED_AT;
  const seed = page();
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seed.calls.length, 0);
  assertEquals(seeded.nextState, seededState);
});

test("new-chat: sends modified_after = cursor - 120s and emits only the chat created after the seed", async () => {
  clock.now = () => SEED_AT + 300_000;
  const t = page([fresh("new-1", SEED_AT + 120_000), old("old-1", SEED_AT + 200_000)]);
  const first = await trigger.poll!({ ...input, state: seededState }, t.ctx);
  assertEquals(t.calls.length, 1);
  assertEquals(t.calls[0].method, "GET");
  assertEquals(
    t.calls[0].url,
    "https://cliq.zoho.com/api/v2/chats?limit=100&modified_after=1794225480000",
  );
  assertEquals(first.events, [fresh("new-1", SEED_AT + 120_000)]);
  assertEquals((first.nextState as { cursor?: number }).cursor, SEED_AT + 300_000);

  const retry = await trigger.poll!(
    { ...input, state: seededState },
    page([fresh("new-1", SEED_AT + 120_000), old("old-1", SEED_AT + 200_000)]).ctx,
  );
  assertEquals(retry, first);

  const again = await trigger.poll!(
    { ...input, state: first.nextState },
    page([fresh("new-1", SEED_AT + 400_000), old("old-1", SEED_AT + 200_000)]).ctx,
  );
  assertEquals(again.events, []);
});

const manyOld = (from: number, count: number) =>
  Array.from(
    { length: count },
    (_, i) => old(`old-${from + i}`, SEED_AT + 290_000 - (from + i) * 1000),
  );
const manyFresh = (from: number, count: number) =>
  Array.from(
    { length: count },
    (_, i) => fresh(`new-${from + i}`, SEED_AT + 290_000 - (from + i) * 1000),
  );

test("new-chat: records created before the seed never fire, even when the window is longer than the page cap", async () => {
  clock.now = () => SEED_AT + 300_000;
  const state1 = await trigger.poll!(
    { ...input, state: seededState },
    page(manyOld(0, 100), manyOld(100, 100), manyOld(200, 100)).ctx,
  );
  assertEquals(state1.events, []);
  const resume = (state1.nextState as { resume?: { before: number; startedAt: number } }).resume;
  assertEquals(resume, {
    before: SEED_AT + 290_000 - 299_000 + 1000,
    startedAt: SEED_AT + 300_000,
  });

  clock.now = () => SEED_AT + 600_000;
  const state2 = await trigger.poll!(
    { ...input, state: state1.nextState },
    page(manyOld(300, 100), []).ctx,
  );
  assertEquals(state2.events, []);
  assertEquals((state2.nextState as { resume?: unknown }).resume, undefined);

  clock.now = () => SEED_AT + 900_000;
  const after = await trigger.poll!(
    { ...input, state: state2.nextState },
    page([fresh("new-x", SEED_AT + 800_000), ...manyOld(0, 5)]).ctx,
  );
  assertEquals(after.events, [fresh("new-x", SEED_AT + 800_000)]);
});

test("new-chat: a window longer than the page cap is drained across checks, none twice, then the cursor advances", async () => {
  clock.now = () => SEED_AT + 300_000;
  const c1 = page(manyFresh(0, 100), manyFresh(100, 100), manyFresh(200, 100));
  const r1 = await trigger.poll!({ ...input, state: seededState }, c1.ctx);
  assertEquals(c1.calls.length, 3);
  assertEquals(r1.events.length, 300);
  const s1 = r1.nextState as { cursor: number; resume?: { before: number; startedAt: number } };
  assertEquals(s1.cursor, SEED_AT); // not advanced: the window is not drained
  assertEquals(s1.resume, {
    before: SEED_AT + 290_000 - 299_000 + 1000,
    startedAt: SEED_AT + 300_000,
  });

  clock.now = () => SEED_AT + 600_000;
  const c2 = page(manyFresh(300, 100), []);
  const r2 = await trigger.poll!({ ...input, state: r1.nextState }, c2.ctx);
  assertEquals(
    c2.calls[0].url,
    "https://cliq.zoho.com/api/v2/chats?limit=100&modified_before=1794225592000&modified_after=1794225480000",
  );
  assertEquals(r2.events.length, 100);
  const s2 = r2.nextState as { cursor: number; resume?: unknown };
  assertEquals(s2.cursor, SEED_AT + 300_000); // advanced to when the window began
  assertEquals(s2.resume, undefined);

  const ids = [...r1.events, ...r2.events].map((c) => (c as { chat_id: string }).chat_id);
  assertEquals(ids.length, 400);
  assertEquals(new Set(ids).size, 400);
});

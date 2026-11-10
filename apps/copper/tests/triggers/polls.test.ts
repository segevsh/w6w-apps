import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";
import newActivity from "../../triggers/new-activity.ts";
import newUser from "../../triggers/new-user.ts";
import newRelatedItem from "../../triggers/new-related-item.ts";
import { pollNewActivities } from "../../lib/polls.ts";

const BASE = "https://api.copper.com/developer_api/v1";

type Rec = Record<string, unknown>;
type PollState = { seeded?: boolean };

const poll = async (
  trigger: { poll?: (...a: never[]) => unknown },
  state: unknown,
  params: unknown,
  ctx: HookContext,
) =>
  await trigger.poll!(
    { state, params } as never,
    ctx as never,
  ) as { events: unknown[]; nextState: PollState };

// ---- New User (snapshot) ---------------------------------------------------------------------

const user = (id: number) => ({ id, name: `User ${id}`, email: `user${id}@example.test` });

test("copper new-user: the seed records the roster and emits nothing", async () => {
  const m = mockCtx([{ body: [user(1), user(2)] }]);
  const out = await poll(newUser, {}, {}, m.ctx);
  assertEquals(out.events, []);
  assertEquals(out.nextState.seeded, true);
});

test("copper new-user: from the seeded state exactly the added user is emitted, idempotently", async () => {
  const seeded = (await poll(newUser, {}, {}, mockCtx([{ body: [user(1), user(2)] }]).ctx))
    .nextState;
  const run = () => poll(newUser, seeded, {}, mockCtx([{ body: [user(3), user(1), user(2)] }]).ctx);
  const a = await run();
  assertEquals(a.events, [user(3)]);
  assertEquals(await run(), a);
});

test("copper new-user: the request is POST /users/search page 1 of 200", async () => {
  const m = mockCtx([{ body: [user(1)] }]);
  await poll(newUser, {}, {}, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals([m.calls[0].method, m.calls[0].url], ["POST", `${BASE}/users/search`]);
  assertEquals(JSON.parse(m.calls[0].body!), { page_number: 1, page_size: 200 });
});

test("copper new-user: a roster longer than one page is read through the next page", async () => {
  const page1 = Array.from({ length: 200 }, (_, i) => user(i + 1));
  const m = mockCtx([{ body: page1 }, { body: [user(201)] }]);
  const seeded = (await poll(newUser, {}, {}, m.ctx)).nextState;
  assertEquals(m.calls.map((c) => JSON.parse(c.body!).page_number), [1, 2]);
  const m2 = mockCtx([{ body: page1 }, { body: [user(201), user(202)] }]);
  assertEquals((await poll(newUser, seeded, {}, m2.ctx)).events, [user(202)]);
});

test("copper new-user: a user without an id fails the check instead of being dropped", async () => {
  await assertRejects(() => poll(newUser, {}, {}, mockCtx([{ body: [{ name: "x" }] }]).ctx));
});

// ---- New Related Item (snapshot) -------------------------------------------------------------

test("copper new-related-item: seed emits nothing, then exactly the new relation, idempotently", async () => {
  const params = { entity: "people", entityId: "123" };
  const before = [{ id: 208105, type: "project" }, { id: 13358412, type: "company" }];
  const m = mockCtx([{ body: before }]);
  const seeded = await poll(newRelatedItem, {}, params, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const after = [...before, { id: 4417020, type: "opportunity" }];
  const run = () => poll(newRelatedItem, seeded.nextState, params, mockCtx([{ body: after }]).ctx);
  const a = await run();
  assertEquals(a.events, [{ id: 4417020, type: "opportunity" }]);
  assertEquals(await run(), a);
});

test("copper new-related-item: the same id under another type is a different relation", async () => {
  const params = { entity: "people", entityId: "123" };
  const seeded = await poll(
    newRelatedItem,
    {},
    params,
    mockCtx([{ body: [{ id: 5, type: "task" }] }]).ctx,
  );
  const out = await poll(
    newRelatedItem,
    seeded.nextState,
    params,
    mockCtx([{ body: [{ id: 5, type: "task" }, { id: 5, type: "company" }] }]).ctx,
  );
  assertEquals(out.events, [{ id: 5, type: "company" }]);
});

test("copper new-related-item: the request is GET /{entity}/{id}/related/ and narrows by related type", async () => {
  const all = mockCtx([{ body: [] }]);
  await poll(newRelatedItem, {}, { entity: "people", entityId: "123" }, all.ctx);
  assertEquals([all.calls[0].method, all.calls[0].url], ["GET", `${BASE}/people/123/related/`]);
  const narrowed = mockCtx([{ body: [] }]);
  await poll(
    newRelatedItem,
    {},
    { entity: "people", entityId: "123", relatedEntity: "companies" },
    narrowed.ctx,
  );
  assertEquals([narrowed.calls[0].method, narrowed.calls[0].url], [
    "GET",
    `${BASE}/people/123/related/companies`,
  ]);
});

test("copper new-related-item: a stub without an id or type fails the check", async () => {
  const params = { entity: "people", entityId: "123" };
  await assertRejects(() => poll(newRelatedItem, {}, params, mockCtx([{ body: [{ id: 1 }] }]).ctx));
});

// ---- New Activity (since-filter) -------------------------------------------------------------

const FLOOR = 1_800_000_000_000; // ms; the seed time in the literal states below
const T = FLOOR / 1000;

const activity = (id: number, created: number): Rec => ({
  id,
  parent: { id: 1, type: "person" },
  type: { id: 0, category: "user" },
  user_id: 7,
  details: `activity ${id}`,
  activity_date: created,
  old_value: null,
  new_value: null,
  date_created: created,
  date_modified: created,
});

const seededState = (over: Rec = {}) => ({
  v: 1,
  kind: "since",
  seeded: true,
  floor: FLOOR,
  since: T,
  windowEnd: null,
  page: 1,
  seen: [] as string[],
  ...over,
});

/** A fake Copper: every request is answered from `all` by the body's page_number/page_size. */
function server(all: Rec[]) {
  const bodies: Rec[] = [];
  const ctx = {
    fetch: (_url: unknown, init?: RequestInit) => {
      const b = JSON.parse(String(init!.body)) as Rec;
      bodies.push(b);
      const size = b.page_size as number;
      const page = b.page_number as number;
      return Promise.resolve(
        new Response(JSON.stringify(all.slice((page - 1) * size, page * size)), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
    log: () => {},
  } as unknown as HookContext;
  return { ctx, bodies };
}

const ids = (events: unknown[]) => events.map((e) => (e as Rec).id);

test("copper new-activity: the seed emits nothing and stores the floor", async () => {
  const m = mockCtx([]);
  const out = await poll(newActivity, {}, {}, m.ctx);
  assertEquals(out.events, []);
  assertEquals(out.nextState.seeded, true);
  assertEquals(m.calls.length, 0);
});

test("copper new-activity: from the seeded state exactly the new activity is emitted, idempotently", async () => {
  const body = [activity(2, T - 500), activity(3, T + 30)];
  const run = () => poll(newActivity, seededState(), {}, mockCtx([{ body }]).ctx);
  const a = await run();
  assertEquals(a.events, [activity(3, T + 30)]);
  assertEquals((a.nextState as unknown as { seen: string[] }).seen, ["3"]);
  assertEquals(await run(), a);
});

test("copper new-activity: the request is POST /activities/search with the window minus 120 s", async () => {
  const m = mockCtx([{ body: [] }]);
  await poll(newActivity, seededState(), {}, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals([m.calls[0].method, m.calls[0].url], ["POST", `${BASE}/activities/search`]);
  assertEquals(JSON.parse(m.calls[0].body!), {
    minimum_activity_date: 1_799_999_880,
    page_number: 1,
    page_size: 200,
  });
});

test("copper new-activity: an activity already emitted is not emitted again, and the window advances after a drain", async () => {
  const now = FLOOR + 600_000;
  const first = await pollNewActivities(
    seededState(),
    server([activity(3, T + 30)]).ctx,
    now,
  );
  assertEquals(ids(first.events), [3]);
  assertEquals([first.nextState.since, first.nextState.windowEnd, first.nextState.page], [
    T + 600,
    null,
    1,
  ]);
  const s = server([activity(3, T + 30), activity(4, T + 700)]);
  const second = await pollNewActivities(first.nextState, s.ctx, now + 300_000);
  assertEquals(ids(second.events), [4]);
  assertEquals(s.bodies[0].minimum_activity_date, T + 600 - 120);
});

test("copper new-activity: a window of more than maxPages full pages is drained across checks, none twice", async () => {
  // 4 full pages of activities, all created after the seed.
  const all = Array.from({ length: 800 }, (_, i) => activity(1000 + i, T + 10 + i));
  const s = server(all);
  let state: unknown = seededState();
  const emitted: unknown[] = [];
  let drainedAt = -1;
  for (let check = 0; check < 40; check++) {
    const out = await pollNewActivities(state, s.ctx, FLOOR + 60_000);
    emitted.push(...ids(out.events));
    state = out.nextState;
    if (out.nextState.windowEnd === null && out.nextState.page === 1 && drainedAt < 0) {
      drainedAt = check;
    }
    if (drainedAt >= 0) break;
  }
  assertEquals(new Set(emitted).size, 800);
  assertEquals(emitted.length, 800);
  assertEquals(emitted.sort(), all.map((r) => r.id).sort());
  // the cursor advanced after the drain
  assertEquals((state as { since: number }).since, T + 60);
});

test("copper new-activity: records that existed before the seed are never emitted, however many pages hold them", async () => {
  const old = Array.from({ length: 800 }, (_, i) => activity(5000 + i, T - 10_000 + i));
  // 1000 records created before the seed fill pages 1-5; the one created after it sits on page 6.
  const all = [...old, ...Array.from({ length: 200 }, (_, i) => activity(7000 + i, T - 5000 + i))];
  all.push(activity(9999, T + 20));
  const s = server(all);
  const seen: unknown[] = [];
  let state: unknown = (await pollNewActivities({}, s.ctx, FLOOR)).nextState;
  assertEquals((state as { floor: number }).floor, FLOOR);
  for (let check = 0; check < 6; check++) {
    const out = await pollNewActivities(state, s.ctx, FLOOR + 1000);
    seen.push(...ids(out.events));
    state = out.nextState;
    if ((state as { windowEnd: unknown }).windowEnd === null) break;
  }
  assertEquals(seen, [9999]);
});

test("copper new-activity: an activity without a parseable creation time is kept", async () => {
  const noStamp = { ...activity(8, T + 1), date_created: undefined };
  const out = await pollNewActivities(seededState(), server([noStamp]).ctx, FLOOR + 1000);
  assertEquals(ids(out.events), [8]);
});

test("copper new-activity: more than 100 unseen activities are emitted oldest 100 first, rest on the next check", async () => {
  const all = Array.from({ length: 150 }, (_, i) => activity(100 + i, T + 10 + i));
  const s = server(all);
  const a = await pollNewActivities(seededState(), s.ctx, FLOOR + 1000);
  assertEquals(ids(a.events), all.slice(0, 100).map((r) => r.id));
  assertEquals(a.nextState.seen.length, 100);
  const b = await pollNewActivities(a.nextState, s.ctx, FLOOR + 2000);
  assertEquals(ids(b.events), all.slice(100).map((r) => r.id));
});

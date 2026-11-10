import { afterEach, test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { clock } from "../../lib/triggers.ts";
import newResponse from "../../triggers/new-response.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const params = { formId: "form-1" };
const T0 = Date.parse("2026-11-10T10:00:00.250Z"); // seed
const T1 = Date.parse("2026-11-10T10:10:00Z");
const resp = (id: string, created: string, last = created) => ({
  responseId: id,
  createTime: created,
  lastSubmittedTime: last,
  answers: { q1: { questionId: "q1", textAnswers: { answers: [{ value: id }] } } },
});
const withForm = <T extends object>(r: T) => ({ ...r, formId: "form-1" });

type Out = { events: Array<Record<string, unknown>>; nextState: Record<string, unknown> };
const run = async (state: unknown, pages: Array<Record<string, unknown>>) => {
  const { ctx, calls } = mockCtx(pages.map((body) => ({ body })));
  const r = await newResponse.poll!({ params, state, subscriptionId: "sub_f" }, ctx) as Out;
  return { ...r, calls };
};
const query = (call: { url: string }) => {
  const u = new URL(call.url);
  return { path: u.pathname, query: Object.fromEntries(u.searchParams) };
};
const seed = async () => {
  clock.now = () => T0;
  const r = await run({}, []);
  clock.now = () => T1;
  return r.nextState;
};

test("new-response: declares poll, output, sample and a required formId", () => {
  assertEquals(typeof newResponse.poll, "function");
  assertEquals("onSubscribe" in newResponse, false);
  assert((newResponse.output ?? []).length > 0 && newResponse.sample !== undefined);
  assertEquals((newResponse.params ?? []).map((p) => [p.key, !!p.required]), [["formId", true]]);
});

test("new-response: unseeded state stores floor = now, emits nothing, makes no request", async () => {
  clock.now = () => T0;
  const r = await run({}, []);
  assertEquals(r.events, []);
  assertEquals(r.calls.length, 0);
  assertEquals(r.nextState, {
    v: 1,
    kind: "responses",
    seeded: true,
    floor: T0,
    cursor: T0,
    ids: [],
  });
});

test("new-response: emits exactly the response submitted after the seed, with a literal request", async () => {
  const state = await seed();
  const old = resp("old", "2026-11-10T09:00:00Z");
  const fresh = resp("new1", "2026-11-10T10:05:00.500Z");
  const r = await run(state, [{ responses: [old, fresh] }]);
  assertEquals(r.events, [withForm(fresh)]);
  assertEquals(r.calls.length, 1);
  assertEquals(r.calls[0].method, "GET");
  // cursor (10:00:00.250Z) minus the 120 s overlap, whole seconds.
  assertEquals(query(r.calls[0]), {
    path: "/v1/forms/form-1/responses",
    query: { filter: "timestamp > 2026-11-10T09:58:00Z", pageSize: "200" },
  });
  assertEquals((r.nextState as { cursor: number }).cursor, Date.parse("2026-11-10T10:05:00.500Z"));
});

test("new-response: the same (state, responses) twice is deep-equal", async () => {
  const state = await seed();
  const page = [{ responses: [resp("new1", "2026-11-10T10:05:00Z")] }];
  assertEquals(await run(state, page), await run(state, page));
});

test("new-response: an overlap re-read does not emit the same response twice", async () => {
  const state = await seed();
  const fresh = resp("new1", "2026-11-10T10:05:00Z");
  const first = await run(state, [{ responses: [fresh] }]);
  const second = await run(first.nextState, [{ responses: [fresh] }]);
  assertEquals(second.events, []);
});

test("new-response: a window of maxPages + 1 pages is drained across checks, none twice", async () => {
  const state = await seed();
  const r = (n: number) => resp(`r${n}`, `2026-11-10T10:0${n}:00Z`);
  const first = await run(state, [
    { responses: [r(1)], nextPageToken: "p2" },
    { responses: [r(2)], nextPageToken: "p3" },
    { responses: [r(3)], nextPageToken: "p4" },
  ]);
  assertEquals(first.events.map((e) => e.responseId), ["r1", "r2", "r3"]);
  // Not drained: the cursor must NOT have moved, and the page position is kept.
  assertEquals((first.nextState as { cursor: number }).cursor, T0);
  assertEquals((first.nextState as { resume?: { pageToken: string } }).resume?.pageToken, "p4");
  const second = await run(first.nextState, [{ responses: [r(4), r(3)] }]);
  assertEquals(second.events.map((e) => e.responseId), ["r4"]);
  const q = query(second.calls[0]).query;
  assertEquals([q.pageToken, q.filter], ["p4", "timestamp > 2026-11-10T09:58:00Z"]);
  assertEquals(second.nextState.resume, undefined);
  assertEquals(second.nextState.cursor, Date.parse("2026-11-10T10:04:00Z"));
});

test("new-response: responses created before the seed are never emitted, however many pages", async () => {
  const state = await seed();
  const pre = (n: number) => resp(`pre${n}`, `2026-11-10T09:0${n}:00Z`, "2026-11-10T10:04:00Z");
  const first = await run(state, [
    { responses: [pre(1)], nextPageToken: "p2" },
    { responses: [pre(2)], nextPageToken: "p3" },
    { responses: [pre(3)], nextPageToken: "p4" },
  ]);
  assertEquals(first.events, []);
  const second = await run(first.nextState, [{ responses: [pre(4)] }]);
  assertEquals(second.events, []);
  const fresh = resp("after", "2026-11-10T10:06:00Z");
  const third = await run(second.nextState, [{ responses: [fresh] }]);
  assertEquals(third.events, [withForm(fresh)]);
});

test("new-response: a pasted form URL is reduced to its form id in the request and the event", async () => {
  const state = await seed();
  const { ctx, calls } = mockCtx([{ body: { responses: [resp("n", "2026-11-10T10:05:00Z")] } }]);
  const r = await newResponse.poll!({
    params: { formId: "https://docs.google.com/forms/d/AbC-1_x/edit" },
    state,
    subscriptionId: "s",
  }, ctx) as Out;
  assertEquals(query(calls[0]).path, "/v1/forms/AbC-1_x/responses");
  assertEquals(r.events[0].formId, "AbC-1_x");
});

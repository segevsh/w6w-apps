import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newEmail from "../../triggers/new-email.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const SUB = "sub_1";
// 2025-11-09T12:21:00Z-ish fixed clock: epoch 1762689600 s.
const T0 = 1762689600;
const at = (seconds: number) => {
  clock.now = () => seconds * 1000;
};

const msg = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  threadId: `t_${id}`,
  labelIds: ["INBOX", "UNREAD"],
  snippet: `snippet ${id}`,
  payload: {
    headers: [
      { name: "From", value: "Boss <boss@example.com>" },
      { name: "To", value: "me@example.com" },
      { name: "Subject", value: `subject ${id}` },
      { name: "Date", value: "Mon, 9 Nov 2026 09:00:00 +0000" },
    ],
  },
  ...extra,
});
const list = (...ids: string[]) => ({
  status: 200,
  body: { messages: ids.map((id) => ({ id, threadId: `t_${id}` })) },
});
const got = (id: string) => ({ status: 200, body: msg(id) });
const poll = (params: Record<string, unknown>, state: unknown, r: ReturnType<typeof mockCtx>) =>
  newEmail.poll!({ params, state, subscriptionId: SUB }, r.ctx);

test("declares params, output and sample", () => {
  assertEquals(newEmail.params!.map((p) => p.key), ["q", "labelIds", "includeBody"]);
  assertEquals(newEmail.params!.find((p) => p.key === "includeBody")!.default, false);
  assertEquals(newEmail.minIntervalMs, 60_000);
  assertEquals("onSubscribe" in newEmail, false);
  const keys = newEmail.output!.map((o) => o.key);
  for (
    const k of ["id", "threadId", "from", "to", "cc", "subject", "snippet", "date", "labelIds"]
  ) {
    assertEquals(keys.includes(k), true, k);
    assertEquals(k in (newEmail.sample as object), true, k);
  }
});

test("1 first check seeds the cursor and emits nothing", async () => {
  at(T0);
  const r = mockCtx([list("a", "b")]);
  const out = await poll({}, {}, r);
  assertEquals(out.events, []);
  const s = out.nextState as { seeded: boolean; cursor: number; ids: string[] };
  assertEquals(s.seeded, true);
  assertEquals(s.cursor, T0);
  assertEquals(s.ids.sort(), ["a", "b"]);
  assertEquals(r.calls.length, 1); // no hydrate on the seed check
});

test("2 a new message after seeding is emitted, hydrated", async () => {
  at(T0);
  const seed = await poll({}, {}, mockCtx([list("a")]));
  at(T0 + 60);
  const r = mockCtx([list("b", "a"), got("b")]);
  const out = await poll({}, seed.nextState, r);
  assertEquals(out.events, [{
    id: "b",
    threadId: "t_b",
    from: "Boss <boss@example.com>",
    to: "me@example.com",
    cc: null,
    subject: "subject b",
    snippet: "snippet b",
    date: "Mon, 9 Nov 2026 09:00:00 +0000",
    labelIds: ["INBOX", "UNREAD"],
  }]);
  assertEquals((out.nextState as { cursor: number }).cursor, T0 + 60);
});

test("3 the same (state, responses) twice gives deep-equal results", async () => {
  at(T0);
  const seed = await poll({}, {}, mockCtx([list("a")]));
  at(T0 + 60);
  const run = () => poll({}, seed.nextState, mockCtx([list("b", "a"), got("b")]));
  assertEquals(await run(), await run());
});

test("3b a throwing check leaves the caller's state untouched", async () => {
  at(T0);
  const seed = await poll({}, {}, mockCtx([list("a")]));
  const before = JSON.stringify(seed.nextState);
  at(T0 + 60);
  let threw = false;
  try {
    await poll({}, seed.nextState, mockCtx([list("b"), { status: 500, body: "boom" }]));
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(JSON.stringify(seed.nextState), before);
  // retry from the same state still emits b
  const retry = await poll({}, seed.nextState, mockCtx([list("b"), got("b")]));
  assertEquals(retry.events.map((e) => (e as { id: string }).id), ["b"]);
});

test("4 the list and hydrate requests are the get-many-messages / get-message requests", async () => {
  at(T0 + 60);
  const state = { v: 1, kind: "ids", seeded: true, ids: [], cursor: T0 };
  const r = mockCtx([list("m1"), got("m1")]);
  await poll({ q: "from:boss", labelIds: ["INBOX", "STARRED"] }, state, r);
  const l = new URL(r.calls[0].url);
  assertEquals(r.calls[0].method, "GET");
  assertEquals(l.origin + l.pathname, "https://gmail.googleapis.com/gmail/v1/users/me/messages");
  assertEquals(l.searchParams.get("q"), "from:boss after:1762689480");
  assertEquals(l.searchParams.getAll("labelIds"), ["INBOX", "STARRED"]);
  assertEquals(l.searchParams.get("maxResults"), "100");
  const g = new URL(r.calls[1].url);
  assertEquals(g.origin + g.pathname, "https://gmail.googleapis.com/gmail/v1/users/me/messages/m1");
  assertEquals(g.searchParams.get("format"), "metadata");
  assertEquals(g.searchParams.getAll("metadataHeaders"), ["From", "To", "Cc", "Subject", "Date"]);
});

test("4b no user query gives `after:` alone", async () => {
  at(T0 + 60);
  const state = { v: 1, kind: "ids", seeded: true, ids: [], cursor: T0 };
  const r = mockCtx([list()]);
  await poll({}, state, r);
  assertEquals(new URL(r.calls[0].url).searchParams.get("q"), "after:1762689480");
});

test("A3 overlap: an id seen on the previous check is emitted once", async () => {
  at(T0);
  const seed = await poll({}, {}, mockCtx([list("a")]));
  at(T0 + 60);
  const one = await poll({}, seed.nextState, mockCtx([list("b", "a"), got("b")]));
  assertEquals(one.events.length, 1);
  at(T0 + 120);
  // the 120 s overlap makes the next list return b and a again; neither is re-emitted
  const r = mockCtx([list("b", "a")]);
  const two = await poll({}, one.nextState, r);
  assertEquals(two.events, []);
  assertEquals(r.calls.length, 1);
  assertEquals(new URL(r.calls[0].url).searchParams.get("q"), `after:${T0 + 60 - 120}`);
});

test("A3b a message older than the cursor but inside the overlap is still caught", async () => {
  at(T0 + 60);
  const state = { v: 1, kind: "ids", seeded: true, ids: ["a"], cursor: T0 };
  // late arrival, internally dated T0 - 90 s: inside the window after:T0-120
  const r = mockCtx([list("late", "a"), got("late")]);
  const out = await poll({}, state, r);
  assertEquals(new URL(r.calls[0].url).searchParams.get("q"), `after:${T0 - 120}`);
  assertEquals(out.events.map((e) => (e as { id: string }).id), ["late"]);
});

test("A4 includeBody switches the hydrate call to format=full and adds the body", async () => {
  at(T0 + 60);
  const state = { v: 1, kind: "ids", seeded: true, ids: [], cursor: T0 };
  const full = {
    ...msg("m1"),
    payload: {
      ...msg("m1").payload,
      mimeType: "multipart/alternative",
      parts: [{ mimeType: "text/plain", body: { data: btoa("héllo").replace(/=+$/, "") } }],
    },
  };
  // "héllo" must be UTF-8 encoded before base64url
  const bytes = new TextEncoder().encode("héllo");
  full.payload.parts[0].body.data = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  const r = mockCtx([list("m1"), { status: 200, body: full }]);
  const out = await poll({ includeBody: true }, state, r);
  const g = new URL(r.calls[1].url);
  assertEquals(g.searchParams.get("format"), "full");
  assertEquals(g.searchParams.has("metadataHeaders"), false);
  assertEquals((out.events[0] as { body: string }).body, "héllo");
});

test("a message deleted between list and get is skipped, not fatal", async () => {
  at(T0 + 60);
  const state = { v: 1, kind: "ids", seeded: true, ids: [], cursor: T0 };
  const out = await poll(
    {},
    state,
    mockCtx([list("gone", "b"), got("b"), { status: 404, body: "not found" }]),
  );
  assertEquals(out.events.map((e) => (e as { id: string }).id), ["b"]);
});

const ids = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `n${from + i}`);

test("T1.2b A1 pages past 100: 130 unseen over two pages, oldest-first, pageToken sent", async () => {
  at(T0);
  const seed = await poll({}, {}, mockCtx([list("a")]));
  at(T0 + 60);
  const p1 = ids(31, 130);
  const p2 = ids(1, 30);
  const page1 = { status: 200, body: { ...list(...p1.reverse()).body, nextPageToken: "p2" } };
  const all = [...ids(31, 130).reverse(), ...ids(1, 30).reverse()]; // list order, newest first
  const hydrate = all.slice().reverse().map(got);
  const r = mockCtx([page1, list(...p2.reverse()), ...hydrate]);
  const out = await poll({}, seed.nextState, r);
  assertEquals(out.events.length, 130);
  assertEquals(out.events.map((e) => e.id), all.slice().reverse());
  assertEquals(new URL(r.calls[0].url).searchParams.get("pageToken"), null);
  assertEquals(new URL(r.calls[1].url).searchParams.get("pageToken"), "p2");
});

test("T1.2b A2 a page holding a seen id stops paging: exactly one list call", async () => {
  at(T0);
  const seed = await poll({}, {}, mockCtx([list("a")]));
  at(T0 + 60);
  const page1 = { status: 200, body: { ...list("b", "a").body, nextPageToken: "p2" } };
  const r = mockCtx([page1, got("b")]);
  const out = await poll({}, seed.nextState, r);
  assertEquals(out.events.map((e) => e.id), ["b"]);
  assertEquals(r.calls.length, 2); // one list + one hydrate, no page 2
  assertEquals(new URL(r.calls[1].url).pathname.endsWith("/messages/b"), true);
});

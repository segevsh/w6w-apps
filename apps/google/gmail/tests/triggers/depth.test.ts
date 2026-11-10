import { afterEach, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newLabel from "../../triggers/new-label.ts";
import newDraft from "../../triggers/new-draft.ts";
import newOrUpdatedThread from "../../triggers/new-or-updated-thread.ts";
import { clock } from "../../lib/triggers.ts";

const realNow = clock.now;
afterEach(() => {
  clock.now = realNow;
});

const SUB = "sub_1";
// Fixed clock: epoch 1762689600 s (2025-11-09T12:00:00Z).
const T0 = 1762689600;
const at = (seconds: number) => {
  clock.now = () => seconds * 1000;
};

const url = (u: string) => new URL(u);

// ---------------------------------------------------------------------------------------------
// new-label  (snapshot over GET /users/me/labels)
// ---------------------------------------------------------------------------------------------

const label = (id: string, name = id) => ({ id, name, type: "user" });
const labelsPage = (...ids: string[]) => ({
  status: 200,
  body: { labels: ids.map((i) => label(i)) },
});
const pollLabel = (state: unknown, r: ReturnType<typeof mockCtx>) =>
  newLabel.poll!({ params: {}, state, subscriptionId: SUB }, r.ctx);

test("new-label declares non-empty output and sample, and is a poll trigger", () => {
  assertEquals(newLabel.output!.length > 0, true);
  assertEquals(newLabel.sample !== undefined, true);
  assertEquals("onSubscribe" in newLabel, false);
});

test("new-label 1 first check seeds and emits nothing", async () => {
  const out = await pollLabel({}, mockCtx([labelsPage("INBOX", "Label_1")]));
  assertEquals(out.events, []);
  assertEquals((out.nextState as { seeded: boolean }).seeded, true);
});

test("new-label 2 a label created after the seed is emitted, once", async () => {
  const seed = await pollLabel({}, mockCtx([labelsPage("INBOX")]));
  const out = await pollLabel(seed.nextState, mockCtx([labelsPage("INBOX", "Label_2")]));
  assertEquals(out.events, [label("Label_2")]);
  const again = await pollLabel(out.nextState, mockCtx([labelsPage("INBOX", "Label_2")]));
  assertEquals(again.events, []);
});

test("new-label 3 the same state and response give the same result", async () => {
  const seed = await pollLabel({}, mockCtx([labelsPage("INBOX")]));
  const one = await pollLabel(seed.nextState, mockCtx([labelsPage("INBOX", "Label_2")]));
  const two = await pollLabel(seed.nextState, mockCtx([labelsPage("INBOX", "Label_2")]));
  assertEquals(one, two);
});

test("new-label 4 requests exactly GET /users/me/labels", async () => {
  const r = mockCtx([labelsPage("INBOX")]);
  await pollLabel({}, r);
  assertEquals(r.calls.length, 1);
  assertEquals(r.calls[0].method, "GET");
  assertEquals(r.calls[0].url, "https://gmail.googleapis.com/gmail/v1/users/me/labels");
});

test("new-label 5 a renamed label is not a new label", async () => {
  const seed = await pollLabel({}, mockCtx([labelsPage("Label_1")]));
  const renamed = { status: 200, body: { labels: [label("Label_1", "Renamed")] } };
  const out = await pollLabel(seed.nextState, mockCtx([renamed]));
  assertEquals(out.events, []);
});

// ---------------------------------------------------------------------------------------------
// new-draft  (snapshot over GET /users/me/drafts)
// ---------------------------------------------------------------------------------------------

const draft = (id: string) => ({ id, message: { id: `m_${id}`, threadId: `t_${id}` } });
const draftsPage = (ids: string[], nextPageToken?: string) => ({
  status: 200,
  body: { drafts: ids.map(draft), ...(nextPageToken ? { nextPageToken } : {}) },
});
const pollDraft = (state: unknown, r: ReturnType<typeof mockCtx>) =>
  newDraft.poll!({ params: {}, state, subscriptionId: SUB }, r.ctx);

test("new-draft declares non-empty output and sample, and is a poll trigger", () => {
  assertEquals(newDraft.output!.length > 0, true);
  assertEquals(newDraft.sample !== undefined, true);
  assertEquals("onSubscribe" in newDraft, false);
});

test("new-draft 1 first check seeds and emits nothing", async () => {
  const out = await pollDraft({}, mockCtx([draftsPage(["d1", "d2"])]));
  assertEquals(out.events, []);
  assertEquals((out.nextState as { seeded: boolean }).seeded, true);
});

test("new-draft 2 a draft saved after the seed is emitted, once", async () => {
  const seed = await pollDraft({}, mockCtx([draftsPage(["d1"])]));
  const out = await pollDraft(seed.nextState, mockCtx([draftsPage(["d2", "d1"])]));
  assertEquals(out.events, [draft("d2")]);
  const again = await pollDraft(out.nextState, mockCtx([draftsPage(["d2", "d1"])]));
  assertEquals(again.events, []);
});

test("new-draft 3 the same state and response give the same result", async () => {
  const seed = await pollDraft({}, mockCtx([draftsPage(["d1"])]));
  const one = await pollDraft(seed.nextState, mockCtx([draftsPage(["d2", "d1"])]));
  const two = await pollDraft(seed.nextState, mockCtx([draftsPage(["d2", "d1"])]));
  assertEquals(one, two);
});

test("new-draft 4 requests exactly GET /users/me/drafts?maxResults=500", async () => {
  const r = mockCtx([draftsPage(["d1"])]);
  await pollDraft({}, r);
  assertEquals(r.calls.length, 1);
  assertEquals(r.calls[0].method, "GET");
  assertEquals(
    r.calls[0].url,
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=500",
  );
});

test("new-draft 5 follows nextPageToken, so a draft on page 2 is part of the snapshot", async () => {
  const seed = await pollDraft({}, mockCtx([draftsPage(["d1"], "p2"), draftsPage(["d2"])]));
  const r = mockCtx([draftsPage(["d1"], "p2"), draftsPage(["d2"])]);
  const out = await pollDraft(seed.nextState, r);
  assertEquals(out.events, []); // d2 was already in the seed snapshot
  assertEquals(url(r.calls[1].url).searchParams.get("pageToken"), "p2");
});

test("new-draft 5b an edited draft (new message id, same draft id) is not a new draft", async () => {
  const seed = await pollDraft({}, mockCtx([draftsPage(["d1"])]));
  const edited = {
    status: 200,
    body: { drafts: [{ id: "d1", message: { id: "m_new", threadId: "t_d1" } }] },
  };
  const out = await pollDraft(seed.nextState, mockCtx([edited]));
  assertEquals(out.events, []);
});

test("new-draft 6 a mailbox past the page cap fails loudly, not silently", async () => {
  const pages = Array.from({ length: 10 }, () => draftsPage(["d"], "more"));
  let message = "";
  try {
    await pollDraft({}, mockCtx(pages));
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("more than 5000 drafts"), true);
});

// ---------------------------------------------------------------------------------------------
// new-or-updated-thread  (since-filter over GET /users/me/threads, §9.8 + §9.9)
// ---------------------------------------------------------------------------------------------

const thr = (id: string, historyId = "100") => ({ id, snippet: `snippet ${id}`, historyId });
const thrPage = (threads: unknown[], nextPageToken?: string) => ({
  status: 200,
  body: { threads, ...(nextPageToken ? { nextPageToken } : {}) },
});
const pollThread = (
  params: Record<string, unknown>,
  state: unknown,
  r: ReturnType<typeof mockCtx>,
) => newOrUpdatedThread.poll!({ params, state, subscriptionId: SUB }, r.ctx);
const idsOf = (events: unknown[]) => events.map((e) => (e as { id: string }).id);

test("new-or-updated-thread declares non-empty output and sample, and is a poll trigger", () => {
  assertEquals(newOrUpdatedThread.output!.length > 0, true);
  assertEquals(newOrUpdatedThread.sample !== undefined, true);
  assertEquals(newOrUpdatedThread.params!.map((p) => p.key), ["q", "labelIds"]);
  assertEquals("onSubscribe" in newOrUpdatedThread, false);
});

test("new-or-updated-thread 1 first check seeds floor and cursor, reads nothing, emits nothing", async () => {
  at(T0);
  const r = mockCtx([]);
  const out = await pollThread({}, {}, r);
  assertEquals(out.events, []);
  assertEquals(r.calls.length, 0);
  assertEquals(out.nextState, {
    v: 1,
    kind: "ids",
    seeded: true,
    ids: [],
    cursor: T0,
    floor: T0,
  });
});

test("new-or-updated-thread 2 a thread after the seed is emitted", async () => {
  at(T0);
  const seed = await pollThread({}, {}, mockCtx([]));
  at(T0 + 60);
  const out = await pollThread({}, seed.nextState, mockCtx([thrPage([thr("a")])]));
  assertEquals(idsOf(out.events), ["a"]);
});

test("new-or-updated-thread 3 the same state and response give the same result", async () => {
  at(T0);
  const seed = await pollThread({}, {}, mockCtx([]));
  at(T0 + 60);
  const one = await pollThread({}, seed.nextState, mockCtx([thrPage([thr("a")])]));
  const two = await pollThread({}, seed.nextState, mockCtx([thrPage([thr("a")])]));
  assertEquals(one, two);
});

test("new-or-updated-thread 4 the request is a literal threads.list with the floor as after:", async () => {
  at(T0);
  const seed = await pollThread({}, {}, mockCtx([]));
  at(T0 + 60);
  const r = mockCtx([thrPage([])]);
  await pollThread({ q: "from:boss", labelIds: ["INBOX", "STARRED"] }, seed.nextState, r);
  assertEquals(r.calls.length, 1);
  assertEquals(r.calls[0].method, "GET");
  assertEquals(
    r.calls[0].url,
    "https://gmail.googleapis.com/gmail/v1/users/me/threads?q=from%3Aboss+after%3A1762689600" +
      "&labelIds=INBOX&labelIds=STARRED&maxResults=100",
  );
});

test("new-or-updated-thread 5 an edited thread (new historyId) is a new event, an unchanged one is not", async () => {
  at(T0);
  const seed = await pollThread({}, {}, mockCtx([]));
  at(T0 + 60);
  const first = await pollThread({}, seed.nextState, mockCtx([thrPage([thr("a", "100")])]));
  assertEquals(idsOf(first.events), ["a"]);
  at(T0 + 120);
  const second = await pollThread(
    {},
    first.nextState,
    mockCtx([thrPage([thr("a", "100"), thr("b", "90")])]),
  );
  assertEquals(idsOf(second.events), ["b"]);
  at(T0 + 180);
  const third = await pollThread({}, second.nextState, mockCtx([thrPage([thr("a", "250")])]));
  assertEquals(third.events, [thr("a", "250")]);
});

test("new-or-updated-thread 6 steady state asks for cursor minus the overlap", async () => {
  at(T0);
  const seed = await pollThread({}, {}, mockCtx([]));
  at(T0 + 60);
  const one = await pollThread({}, seed.nextState, mockCtx([thrPage([])]));
  at(T0 + 180);
  const r = mockCtx([thrPage([])]);
  await pollThread({}, one.nextState, r);
  // cursor is T0 + 60 (the last drained window began there); overlap 120 s = T0 - 60 < floor
  // T0 + 60 - 120 = T0 - 60, so the floor wins.
  assertEquals(url(r.calls[0].url).searchParams.get("q"), `after:${T0}`);
  const two = await pollThread({}, one.nextState, mockCtx([thrPage([])]));
  at(T0 + 600);
  const r2 = mockCtx([thrPage([])]);
  await pollThread({}, two.nextState, r2);
  assertEquals(url(r2.calls[0].url).searchParams.get("q"), `after:${T0 + 180 - 120}`);
});

test("new-or-updated-thread 7 (9.8) a window of more than 3 pages drains over successive checks", async () => {
  at(T0);
  const seed = await pollThread({}, {}, mockCtx([]));
  const full = (from: number) =>
    Array.from({ length: 100 }, (_, i) => thr(`t${from + i}`, String(1000 + from + i)));
  at(T0 + 60);
  const r1 = mockCtx([
    thrPage(full(0), "p2"),
    thrPage(full(100), "p3"),
    thrPage(full(200), "p4"),
  ]);
  const c1 = await pollThread({}, seed.nextState, r1);
  assertEquals(c1.events.length, 300);
  const s1 = c1.nextState as { cursor: number; resume?: { pageToken: string; after: number } };
  assertEquals(s1.cursor, T0); // not advanced: the window is not drained
  assertEquals(s1.resume?.pageToken, "p4");
  assertEquals(s1.resume?.after, T0);

  at(T0 + 120);
  const r2 = mockCtx([thrPage(full(300))]);
  const c2 = await pollThread({}, c1.nextState, r2);
  assertEquals(c2.events.length, 100);
  assertEquals(url(r2.calls[0].url).searchParams.get("pageToken"), "p4");
  assertEquals(url(r2.calls[0].url).searchParams.get("q"), `after:${T0}`);
  const s2 = c2.nextState as { cursor: number; resume?: unknown };
  assertEquals(s2.cursor, T0 + 60); // advanced to when the drained window began
  assertEquals(s2.resume, undefined);

  const all = [...c1.events, ...c2.events].map((e) => (e as { id: string }).id);
  assertEquals(new Set(all).size, 400); // every thread once, none twice
});

test("new-or-updated-thread 8 (9.9) threads that predate the seed are never asked for", async () => {
  at(T0);
  const seed = await pollThread({}, {}, mockCtx([]));
  // The seed read nothing, so the first window opens at the seed instant, not 120 s before it.
  at(T0 + 30);
  const r = mockCtx([thrPage([])]);
  const out = await pollThread({}, seed.nextState, r);
  assertEquals(out.events, []);
  assertEquals(url(r.calls[0].url).searchParams.get("q"), `after:${T0}`);
  // ...and a thread that arrives after the seed is the only one emitted.
  at(T0 + 90);
  const next = await pollThread({}, out.nextState, mockCtx([thrPage([thr("fresh")])]));
  assertEquals(idsOf(next.events), ["fresh"]);
});

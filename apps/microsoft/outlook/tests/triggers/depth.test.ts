import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newEvent from "../../triggers/new-event.ts";
import newCalendar from "../../triggers/new-calendar.ts";
import newMailFolder from "../../triggers/new-mail-folder.ts";

const SUB = "sub";
const GRAPH = "https://graph.microsoft.com/v1.0";
const page = (value: unknown[], nextLink?: string) => ({
  body: { value, ...(nextLink ? { "@odata.nextLink": nextLink } : {}) },
});

// ---------------------------------------------------------------------------------------------
// new-event: newest-first over GET /me/events?$orderby=createdDateTime desc
// ---------------------------------------------------------------------------------------------

const ev = (id: string) => ({
  id,
  subject: `Event ${id}`,
  createdDateTime: "2026-11-09T12:00:00Z",
});
const pollEvent = (
  params: Record<string, unknown>,
  state: unknown,
  r: ReturnType<typeof mockCtx>,
) => newEvent.poll!({ params, state, subscriptionId: SUB }, r.ctx);

test("new-event declares non-empty output and sample, and is a poll trigger", () => {
  assertEquals(newEvent.output!.length > 0, true);
  assertEquals(newEvent.sample !== undefined, true);
  assertEquals("onSubscribe" in newEvent, false);
});

test("new-event 1 first check seeds and emits nothing", async () => {
  const out = await pollEvent({}, {}, mockCtx([page([ev("old")])]));
  assertEquals(out.events, []);
  assertEquals(out.nextState?.seeded, true);
});

test("new-event 2 an event created after the seed is emitted", async () => {
  const seed = await pollEvent({}, {}, mockCtx([page([ev("old")])]));
  const out = await pollEvent({}, seed.nextState, mockCtx([page([ev("new"), ev("old")])]));
  assertEquals(out.events, [ev("new")]);
});

test("new-event 3 the same state and response give the same result", async () => {
  const seed = await pollEvent({}, {}, mockCtx([page([ev("old")])]));
  const one = await pollEvent({}, seed.nextState, mockCtx([page([ev("new"), ev("old")])]));
  const two = await pollEvent({}, seed.nextState, mockCtx([page([ev("new"), ev("old")])]));
  assertEquals(one, two);
});

test("new-event 4 the request is a literal newest-created-first list of /me/events", async () => {
  const r = mockCtx([page([])]);
  await pollEvent({}, {}, r);
  assertEquals(r.calls[0], {
    method: "GET",
    url: `${GRAPH}/me/events?%24orderby=createdDateTime+desc&%24top=50`,
    headers: {},
    body: null,
  });
});

test("new-event 4b a calendar id targets /me/calendars/{id}/events", async () => {
  const r = mockCtx([page([])]);
  await pollEvent({ calendarId: "cal 1" }, {}, r);
  assertEquals(
    r.calls[0].url,
    `${GRAPH}/me/calendars/cal%201/events?%24orderby=createdDateTime+desc&%24top=50`,
  );
});

// ---------------------------------------------------------------------------------------------
// new-calendar: snapshot over GET /me/calendars
// ---------------------------------------------------------------------------------------------

const cal = (id: string, name = id) => ({ id, name, color: "auto", canEdit: true });
const pollCal = (state: unknown, r: ReturnType<typeof mockCtx>) =>
  newCalendar.poll!({ params: {}, state, subscriptionId: SUB }, r.ctx);

test("new-calendar declares non-empty output and sample, and is a poll trigger", () => {
  assertEquals(newCalendar.output!.length > 0, true);
  assertEquals(newCalendar.sample !== undefined, true);
  assertEquals("onSubscribe" in newCalendar, false);
});

test("new-calendar 1 first check seeds and emits nothing", async () => {
  const out = await pollCal({}, mockCtx([page([cal("c1")])]));
  assertEquals(out.events, []);
  assertEquals((out.nextState as { seeded: boolean }).seeded, true);
});

test("new-calendar 2 a calendar added after the seed is emitted, once", async () => {
  const seed = await pollCal({}, mockCtx([page([cal("c1")])]));
  const out = await pollCal(seed.nextState, mockCtx([page([cal("c1"), cal("c2")])]));
  assertEquals(out.events, [cal("c2")]);
  const again = await pollCal(out.nextState, mockCtx([page([cal("c1"), cal("c2")])]));
  assertEquals(again.events, []);
});

test("new-calendar 3 the same state and response give the same result", async () => {
  const seed = await pollCal({}, mockCtx([page([cal("c1")])]));
  const one = await pollCal(seed.nextState, mockCtx([page([cal("c1"), cal("c2")])]));
  const two = await pollCal(seed.nextState, mockCtx([page([cal("c1"), cal("c2")])]));
  assertEquals(one, two);
});

test("new-calendar 4 the request is a literal GET /me/calendars?$top=100", async () => {
  const r = mockCtx([page([cal("c1")])]);
  await pollCal({}, r);
  assertEquals(r.calls.length, 1);
  assertEquals(r.calls[0], {
    method: "GET",
    url: `${GRAPH}/me/calendars?%24top=100`,
    headers: {},
    body: null,
  });
});

test("new-calendar 5 a renamed calendar is not a new calendar", async () => {
  const seed = await pollCal({}, mockCtx([page([cal("c1")])]));
  const out = await pollCal(seed.nextState, mockCtx([page([cal("c1", "Renamed")])]));
  assertEquals(out.events, []);
});

test("new-calendar 6 follows the next link, so a calendar on page 2 is part of the snapshot", async () => {
  const next = `${GRAPH}/me/calendars?%24top=100&%24skiptoken=abc`;
  const seed = await pollCal({}, mockCtx([page([cal("c1")], next), page([cal("c2")])]));
  const r = mockCtx([page([cal("c1")], next), page([cal("c2")])]);
  const out = await pollCal(seed.nextState, r);
  assertEquals(out.events, []);
  assertEquals(r.calls[1].url, next);
});

test("new-calendar 7 a list longer than the page cap fails the check loudly", async () => {
  const next = `${GRAPH}/me/calendars?%24skiptoken=more`;
  const pages = Array.from({ length: 5 }, () => page([cal("c")], next));
  let message = "";
  try {
    await pollCal({}, mockCtx(pages));
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("more than 500 calendars"), true);
});

// ---------------------------------------------------------------------------------------------
// new-mail-folder: snapshot over GET /me/mailFolders (or /{parent}/childFolders)
// ---------------------------------------------------------------------------------------------

const folder = (id: string, displayName = id) => ({ id, displayName, childFolderCount: 0 });
const pollFolder = (
  params: Record<string, unknown>,
  state: unknown,
  r: ReturnType<typeof mockCtx>,
) => newMailFolder.poll!({ params, state, subscriptionId: SUB }, r.ctx);

test("new-mail-folder declares non-empty output and sample, and is a poll trigger", () => {
  assertEquals(newMailFolder.output!.length > 0, true);
  assertEquals(newMailFolder.sample !== undefined, true);
  assertEquals(newMailFolder.params!.map((p) => p.key), ["parentFolderId"]);
  assertEquals("onSubscribe" in newMailFolder, false);
});

test("new-mail-folder 1 first check seeds and emits nothing", async () => {
  const out = await pollFolder({}, {}, mockCtx([page([folder("inbox")])]));
  assertEquals(out.events, []);
  assertEquals((out.nextState as { seeded: boolean }).seeded, true);
});

test("new-mail-folder 2 a folder created after the seed is emitted, once", async () => {
  const seed = await pollFolder({}, {}, mockCtx([page([folder("f1")])]));
  const out = await pollFolder({}, seed.nextState, mockCtx([page([folder("f1"), folder("f2")])]));
  assertEquals(out.events, [folder("f2")]);
  const again = await pollFolder(
    {},
    out.nextState,
    mockCtx([page([folder("f1"), folder("f2")])]),
  );
  assertEquals(again.events, []);
});

test("new-mail-folder 3 the same state and response give the same result", async () => {
  const seed = await pollFolder({}, {}, mockCtx([page([folder("f1")])]));
  const one = await pollFolder({}, seed.nextState, mockCtx([page([folder("f1"), folder("f2")])]));
  const two = await pollFolder({}, seed.nextState, mockCtx([page([folder("f1"), folder("f2")])]));
  assertEquals(one, two);
});

test("new-mail-folder 4 the request is a literal GET /me/mailFolders?$top=100", async () => {
  const r = mockCtx([page([folder("f1")])]);
  await pollFolder({}, {}, r);
  assertEquals(r.calls[0], {
    method: "GET",
    url: `${GRAPH}/me/mailFolders?%24top=100`,
    headers: {},
    body: null,
  });
});

test("new-mail-folder 4b a parent folder watches its childFolders", async () => {
  const r = mockCtx([page([])]);
  await pollFolder({ parentFolderId: "inbox" }, {}, r);
  assertEquals(r.calls[0].url, `${GRAPH}/me/mailFolders/inbox/childFolders?%24top=100`);
});

test("new-mail-folder 5 a renamed folder is not a new folder", async () => {
  const seed = await pollFolder({}, {}, mockCtx([page([folder("f1")])]));
  const out = await pollFolder({}, seed.nextState, mockCtx([page([folder("f1", "Renamed")])]));
  assertEquals(out.events, []);
});

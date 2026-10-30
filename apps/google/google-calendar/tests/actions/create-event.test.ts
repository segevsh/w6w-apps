import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-event.ts";

test("create-event: POSTs to /calendars/{id}/events with start/end", async () => {
  const created = { id: "evt-1", summary: "Party" };
  const { ctx, calls } = mockCtx([{ body: created }]);
  const result = await action.execute!({
    calendarId: "primary",
    summary: "Party",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    timeZone: "Europe/Berlin",
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/calendar/v3/calendars/primary/events");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.summary, "Party");
  assertEquals(body.start.dateTime, "2026-07-01T09:00:00Z");
  assertEquals(body.end.dateTime, "2026-07-01T10:00:00Z");
  assertEquals(body.start.timeZone, "Europe/Berlin");
  assertEquals(result, created);
});

test("create-event: encodes email-shaped calendar IDs", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "team@example.com",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
  }, ctx);
  const url = new URL(calls[0].url);
  // The `@` in the path segment must be percent-encoded for Google's API.
  assert(url.pathname.includes("team%40example.com/events"));
});

test("create-event: allDay switches to date-only start/end", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    allDay: true,
    start: "2026-07-01",
    end: "2026-07-02",
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.start, { date: "2026-07-01" });
  assertEquals(body.end, { date: "2026-07-02" });
});

test("create-event: fans out attendees and passes recurrence + reminders", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    attendees: ["a@x.com", "b@x.com"],
    recurrence: ["RRULE:FREQ=WEEKLY;COUNT=4"],
    useDefaultReminders: false,
    reminders: [{ method: "email", minutes: 30 }],
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.attendees, [{ email: "a@x.com" }, { email: "b@x.com" }]);
  assertEquals(body.recurrence, ["RRULE:FREQ=WEEKLY;COUNT=4"]);
  assertEquals(body.reminders, {
    useDefault: false,
    overrides: [{ method: "email", minutes: 30 }],
  });
});

test("create-event: reminders param renders as a group/repeat list, not a scalar or JSON stopgap", () => {
  const reminders = action.params?.find((p) => p.key === "reminders");
  assertEquals(reminders?.type, "group");
  assertEquals(reminders?.repeat, true);
  assertEquals(reminders?.children?.map((c) => c.key), ["method", "minutes"]);
  assertEquals(reminders?.children?.find((c) => c.key === "method")?.type, "select");
  assertEquals(reminders?.children?.find((c) => c.key === "minutes")?.type, "number");
});

test("create-event: useDefaultReminders=false with no reminders sends undefined overrides", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    useDefaultReminders: false,
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.reminders.useDefault, false);
  assertEquals(body.reminders.overrides, undefined);
});

test("create-event: attachments map into body and flip supportsAttachments query", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    attachments: [{ fileUrl: "https://drive.google.com/file/d/abc", title: "Agenda" }],
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.attachments, [
    { fileUrl: "https://drive.google.com/file/d/abc", title: "Agenda" },
  ]);
  assertEquals(new URL(calls[0].url).searchParams.get("supportsAttachments"), "true");
});

test("create-event: no attachments omits supportsAttachments query", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
  }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("supportsAttachments"), null);
});

test("create-event: conferenceSolution sets conferenceData and flips version query", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    conferenceSolution: "hangoutsMeet",
  }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.conferenceData.createRequest.conferenceSolution.type, "hangoutsMeet");
  assert(typeof body.conferenceData.createRequest.requestId === "string");
  assertEquals(new URL(calls[0].url).searchParams.get("conferenceDataVersion"), "1");
});

test("create-event: forwards sendUpdates and maxAttendees as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e" } }]);
  await action.execute!({
    calendarId: "primary",
    start: "2026-07-01T09:00:00Z",
    end: "2026-07-01T10:00:00Z",
    sendUpdates: "all",
    maxAttendees: 10,
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("sendUpdates"), "all");
  assertEquals(params.get("maxAttendees"), "10");
});

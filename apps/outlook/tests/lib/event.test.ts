import { assertEquals, assertThrows } from "@std/assert";
import { buildEvent, eventParams, scheduleParams } from "../../lib/event.ts";

Deno.test("buildEvent: maps the params onto Graph's event resource", () => {
  const out = buildEvent({
    subject: "Sync",
    bodyContent: "Agenda",
    bodyType: "Text",
    start: "2026-08-15T12:00:00",
    end: "2026-08-15T13:00:00",
    timeZone: "Pacific Standard Time",
    location: "Room 4",
    showAs: "busy",
    isOnlineMeeting: true,
    onlineMeetingProvider: "teamsForBusiness",
  });

  assertEquals(out.subject, "Sync");
  assertEquals(out.body, { contentType: "Text", content: "Agenda" });
  assertEquals(out.start, { dateTime: "2026-08-15T12:00:00", timeZone: "Pacific Standard Time" });
  assertEquals(out.end, { dateTime: "2026-08-15T13:00:00", timeZone: "Pacific Standard Time" });
  assertEquals(out.location, { displayName: "Room 4" });
  assertEquals(out.showAs, "busy");
  assertEquals(out.isOnlineMeeting, true);
  assertEquals(out.onlineMeetingProvider, "teamsForBusiness");
});

Deno.test("buildEvent: merges the three attendee lists with their Graph types", () => {
  const out = buildEvent({
    requiredAttendees: ["Alice <a@x.com>"],
    optionalAttendees: ["b@x.com"],
    resourceAttendees: ["room@x.com"],
  });
  assertEquals(out.attendees, [
    { type: "required", emailAddress: { address: "a@x.com", name: "Alice" } },
    { type: "optional", emailAddress: { address: "b@x.com" } },
    { type: "resource", emailAddress: { address: "room@x.com" } },
  ]);
});

Deno.test("buildEvent: omits attendees entirely when no list has entries", () => {
  const out = buildEvent({ subject: "Solo", requiredAttendees: [], optionalAttendees: ["  "] });
  assertEquals(out.attendees, undefined);
  assertEquals(Object.keys(out), ["subject"]);
});

Deno.test("buildEvent: accepts recurrence as an object or a JSON string", () => {
  const pattern = {
    pattern: { type: "weekly", interval: 1, daysOfWeek: ["Monday"] },
    range: { type: "endDate", startDate: "2026-09-01", endDate: "2026-12-31" },
  };
  assertEquals(buildEvent({ recurrence: pattern }).recurrence, pattern);
  assertEquals(buildEvent({ recurrence: JSON.stringify(pattern) }).recurrence, pattern);
  assertEquals(buildEvent({ recurrence: "" }).recurrence, undefined);
});

Deno.test("buildEvent: rejects unparseable recurrence with a legible message", () => {
  assertThrows(
    () => buildEvent({ recurrence: "{not json" }),
    Error,
    "recurrence",
  );
});

Deno.test("buildEvent: strips the UTC offset from start and end", () => {
  const out = buildEvent({ start: "2026-08-15T12:00:00Z", end: "2026-08-15T13:00:00-07:00" });
  assertEquals(out.start, { dateTime: "2026-08-15T12:00:00", timeZone: "UTC" });
  assertEquals(out.end, { dateTime: "2026-08-15T13:00:00", timeZone: "UTC" });
});

Deno.test("scheduleParams: marks start and end required only on create", () => {
  const required = scheduleParams(true);
  const optional = scheduleParams(false);
  assertEquals(required.find((p) => p.key === "start")?.required, true);
  assertEquals(required.find((p) => p.key === "end")?.required, true);
  assertEquals(optional.find((p) => p.key === "start")?.required, false);
});

Deno.test("eventParams: every key is unique and the enums match Graph's vocabulary", () => {
  const keys = eventParams().map((p) => p.key);
  assertEquals(new Set(keys).size, keys.length);

  const showAs = eventParams().find((p) => p.key === "showAs");
  assertEquals(
    (showAs?.options as Array<{ value: string }>).map((o) => o.value),
    ["free", "tentative", "busy", "oof", "workingElsewhere", "unknown"],
  );

  const sensitivity = eventParams().find((p) => p.key === "sensitivity");
  assertEquals(
    (sensitivity?.options as Array<{ value: string }>).map((o) => o.value),
    ["normal", "personal", "private", "confidential"],
  );
});

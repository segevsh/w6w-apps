import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-event.ts";

Deno.test("update-event: PATCHes only what changed", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", subject: "Renamed" } }]);
  const out = await action.execute({ eventId: "e1", subject: "Renamed" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/events/e1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { subject: "Renamed" });
  assertEquals((out as { subject: string }).subject, "Renamed");
});

Deno.test("update-event: targets the per-calendar path when a calendar is named", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ eventId: "e1", calendarId: "cal-1", subject: "x" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/calendars/cal-1/events/e1");
});

Deno.test("update-event: reschedules when start and end move together", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    eventId: "e1",
    start: "2026-08-15T14:00:00",
    end: "2026-08-15T15:00:00",
    timeZone: "UTC",
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {
    start: { dateTime: "2026-08-15T14:00:00", timeZone: "UTC" },
    end: { dateTime: "2026-08-15T15:00:00", timeZone: "UTC" },
  });
});

Deno.test("update-event: refuses to move only one end of the range", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(
    () => action.execute({ eventId: "e1", start: "2026-08-15T14:00:00" }, ctx),
    Error,
    "must be changed together",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-event: refuses a no-op PATCH", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(
    () => action.execute({ eventId: "e1" }, ctx),
    Error,
    "at least one property",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-event: does not expose transactionId, which Graph makes write-once", () => {
  assertEquals(action.params?.some((p) => p.key === "transactionId"), false);
});

Deno.test("update-event: leaving attendees empty does not clear them", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ eventId: "e1", subject: "x" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).attendees, undefined);
});

import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/booking-create.ts";

Deno.test("booking-create: POSTs /bookings with cal-api-version 2026-02-25", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { uid: "new-uid" } } }]);
  const result = await action.execute(
    {
      eventTypeId: 7,
      start: "2026-08-10T15:00:00Z",
      attendeeName: "Jane Doe",
      attendeeTimeZone: "America/New_York",
      attendeeEmail: "jane@example.com",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/bookings");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["cal-api-version"], "2026-02-25");
  assertEquals(result, { data: { uid: "new-uid" } });

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.eventTypeId, 7);
  assertEquals(body.start, "2026-08-10T15:00:00Z");
  // JSON.stringify drops undefined-valued keys, so only the fields actually
  // supplied round-trip through the mock's JSON encode/decode.
  assertEquals(body.attendee, {
    name: "Jane Doe",
    timeZone: "America/New_York",
    email: "jane@example.com",
  });
});

Deno.test("booking-create: forwards a structured location object verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute(
    {
      eventTypeId: 7,
      start: "2026-08-10T15:00:00Z",
      attendeeName: "Jane Doe",
      attendeeTimeZone: "UTC",
      location: { type: "integration", integration: "cal-video" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.location, { type: "integration", integration: "cal-video" });
});

Deno.test("booking-create: forwards guests, lengthInMinutes and metadata", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute(
    {
      eventTypeId: 7,
      start: "2026-08-10T15:00:00Z",
      attendeeName: "Jane Doe",
      attendeeTimeZone: "UTC",
      guests: ["a@b.com", "c@d.com"],
      lengthInMinutes: 45,
      metadata: { source: "w6w" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.guests, ["a@b.com", "c@d.com"]);
  assertEquals(body.lengthInMinutes, 45);
  assertEquals(body.metadata, { source: "w6w" });
});

Deno.test("booking-create: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
});

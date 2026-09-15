import { assertEquals } from "@std/assert";
import rsvpAttendeeUpdate from "../../actions/rsvp-attendee-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rsvp-attendee-update: PATCHes only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "att-1", attending: "not-going" } }]);
  const out = await rsvpAttendeeUpdate.execute(
    { attendeeId: "att-1", attending: "not-going" },
    ctx,
  ) as { attending: string };
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/rsvps/att-1");
  assertEquals(JSON.parse(calls[0].body!), { attending: "not-going" });
  assertEquals(out.attending, "not-going");
});

Deno.test("rsvp-attendee-update: is declared idempotent", () => {
  assertEquals(rsvpAttendeeUpdate.idempotent, true);
});

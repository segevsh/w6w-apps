import { assertEquals, assertRejects } from "@std/assert";
import rsvpAttendeeRetrieve from "../../actions/rsvp-attendee-retrieve.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rsvp-attendee-retrieve: GETs by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "att-1", email: "a@b.com" } }]);
  const out = await rsvpAttendeeRetrieve.execute({ attendeeId: "att-1" }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/rsvps/att-1");
  assertEquals(out.id, "att-1");
});

Deno.test("rsvp-attendee-retrieve: a 404 on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: undefined }]);
  await assertRejects(
    () => Promise.resolve(rsvpAttendeeRetrieve.execute({ attendeeId: "missing" }, ctx)),
    Error,
  );
});

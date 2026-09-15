import { assertEquals, assertRejects } from "@std/assert";
import rsvpAttendeeDelete from "../../actions/rsvp-attendee-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rsvp-attendee-delete: DELETEs and reports the 204 with no body to parse", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await rsvpAttendeeDelete.execute({ attendeeId: "att-1" }, ctx) as {
    attendeeId: string;
    status: number;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/rsvps/att-1");
  assertEquals(out, { attendeeId: "att-1", status: 204 });
});

Deno.test("rsvp-attendee-delete: a repeat delete on an unknown id surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: undefined }]);
  await assertRejects(
    () => Promise.resolve(rsvpAttendeeDelete.execute({ attendeeId: "att-1" }, ctx)),
    Error,
  );
});

Deno.test("rsvp-attendee-delete: is declared idempotent", () => {
  assertEquals(rsvpAttendeeDelete.idempotent, true);
});

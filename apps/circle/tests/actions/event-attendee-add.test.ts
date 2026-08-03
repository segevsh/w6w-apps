import { assertEquals } from "@std/assert";
import { API, bodyOf, mockCtx } from "../_helpers.ts";
import action from "../../actions/event-attendee-add.ts";

Deno.test("event-attendee-add: POSTs /event_attendees with member_email, not email", async () => {
  // This route names the field `member_email`; the space-membership routes call
  // theirs plain `email`. Neither is guessable from the other.
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ eventId: 2, memberEmail: "a@b.c" }, ctx);
  assertEquals(calls[0].url, `${API}/event_attendees`);
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), { event_id: 2, member_email: "a@b.c" });
});

/**
 * Circle's schema marks neither field required, which is almost certainly an
 * omission — an RSVP with no event and no member is not an operation. Both are
 * required here, deliberately diverging in the safe direction: a call that
 * cannot succeed still spends a metered request.
 */
Deno.test("event-attendee-add: both fields are required despite the schema saying otherwise", () => {
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), [
    "eventId",
    "memberEmail",
  ]);
});

Deno.test("event-attendee-add: is idempotent", () => {
  assertEquals(action.idempotent, true);
});

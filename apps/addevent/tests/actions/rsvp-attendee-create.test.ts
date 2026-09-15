import { assertEquals, assertRejects } from "@std/assert";
import rsvpAttendeeCreate from "../../actions/rsvp-attendee-create.ts";
import { mockCtx, pathOf, validationErrorBody } from "../_helpers.ts";

Deno.test("rsvp-attendee-create: POSTs under the event, mapping notify to the wire's notify=active", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "att-1", event_id: "evt-1", email: "a@b.com", attending: "going" } },
  ]);

  const out = await rsvpAttendeeCreate.execute(
    { eventId: "evt-1", email: "a@b.com", attending: "going", notify: true },
    ctx,
  ) as { id: string; email: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/calevent/v2/events/evt-1/rsvps");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.email, "a@b.com");
  assertEquals(sent.attending, "going");
  assertEquals(sent.notify, "active");
  assertEquals(out.email, "a@b.com");
});

Deno.test("rsvp-attendee-create: notify left unset sends no notify field — no email by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "att-1" } }]);
  await rsvpAttendeeCreate.execute({ eventId: "evt-1", email: "a@b.com" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals("notify" in sent, false);
});

Deno.test("rsvp-attendee-create: a 400 validation error surfaces the field-level reasons", async () => {
  const { ctx } = mockCtx([
    {
      status: 400,
      body: validationErrorBody([{ name: "email", reason: "Must be a valid email" }]),
    },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(rsvpAttendeeCreate.execute({ eventId: "evt-1", email: "bad" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("email: Must be a valid email"), true, err.message);
});

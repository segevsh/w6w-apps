import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/appointment-create.ts";

Deno.test("appointment-create: POSTs /appointments with the required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute(
    {
      datetime: "2026-08-15T14:00:00-0400",
      appointmentTypeID: 7,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/appointments");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.datetime, "2026-08-15T14:00:00-0400");
  assertEquals(body.appointmentTypeID, 7);
  assertEquals(body.firstName, "Jane");
  assertEquals(body.lastName, "Doe");
  assertEquals(body.email, "jane@example.com");
});

Deno.test("appointment-create: includes optional fields when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute(
    {
      datetime: "2026-08-15T14:00:00-0400",
      appointmentTypeID: 7,
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      calendarID: 3,
      notes: "VIP client",
      smsOptIn: true,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.calendarID, 3);
  assertEquals(body.notes, "VIP client");
  assertEquals(body.smsOptIn, true);
});

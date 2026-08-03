import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import createAppointment from "../../actions/create-appointment.ts";

Deno.test("create-appointment: POSTs /appointments, sendInvitation on the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 13854 } }]);
  await createAppointment.execute({
    title: "Showing",
    start: "2026-09-04T16:00:00Z",
    end: "2026-09-04T17:00:00Z",
    invitees: [{ userId: 1, name: "Tom" }, { personId: 44673, name: "John Q" }],
    sendInvitation: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/appointments");
  assertEquals(url.searchParams.get("sendInvitation"), "true");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Showing",
    start: "2026-09-04T16:00:00Z",
    end: "2026-09-04T17:00:00Z",
    invitees: [{ userId: 1, name: "Tom" }, { personId: 44673, name: "John Q" }],
  });
});

Deno.test("create-appointment: requires title, start and end", () => {
  assertEquals(
    (createAppointment.params ?? []).filter((p) => p.required).map((p) => p.key),
    ["title", "start", "end"],
  );
});

/** Omit the agent's own user and the appointment never reaches their calendar. */

/** Omit the agent's own user and the appointment never reaches their calendar. */
Deno.test("create-appointment: warns about the calendar-sync precondition", () => {
  assert(/calendar/i.test(createAppointment.description!));
  assert(param(createAppointment, "invitees").hint?.includes("agent's own user entry"));
});

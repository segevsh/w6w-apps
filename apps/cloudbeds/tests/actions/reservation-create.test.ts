import { assert, assertEquals, assertRejects } from "@std/assert";
import reservationCreate from "../../actions/reservation-create.ts";
import { envelope, formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reservation-create: POST /postReservation, form-encoded, with a room row", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}, { reservationID: "res1" }) }]);
  await reservationCreate.execute(
    {
      propertyID: "1",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      guestFirstName: "Ada",
      guestLastName: "Lovelace",
      rooms: [{ roomTypeID: "rt1", quantity: 1 }],
      adults: [{ roomTypeID: "rt1", quantity: 2 }],
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/v1.3/postReservation");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const form = formOf(calls[0].body);
  assertEquals(form.propertyID, "1");
  assertEquals(form.guestFirstName, "Ada");
  assertEquals(form["rooms[0][roomTypeID]"], "rt1");
  assertEquals(form["rooms[0][quantity]"], "1");
  assertEquals(form["adults[0][roomTypeID]"], "rt1");
});

Deno.test("reservation-create: no field is marked required — the vendor's schema requires none", () => {
  const required = reservationCreate.params!.filter((p) => p.required);
  assertEquals(required.length, 0);
});

Deno.test("reservation-create: is not idempotent — the vendor accepts no idempotency key", () => {
  assertEquals(reservationCreate.idempotent, false);
});

Deno.test("reservation-create: guestRequirements as malformed JSON is refused before the request goes out", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await reservationCreate.execute(
        { propertyID: "1", guestRequirements: "{not json" },
        ctx,
      );
    },
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("reservation-create: an HTTP-200 success:false response is surfaced as a failure", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { success: false, message: "property is no longer active" },
  }]);
  const err = await assertRejects(
    async () => {
      await reservationCreate.execute({ propertyID: "1" }, ctx);
    },
    Error,
  );
  assert(err.message.includes("property is no longer active"), err.message);
});

import { assertEquals } from "@std/assert";
import reservationUpdate from "../../actions/reservation-update.ts";
import { envelope, formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("reservation-update: PUT /putReservation, form-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await reservationUpdate.execute(
    { reservationID: "res1", propertyID: "1", status: "checked_in" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/v1.3/putReservation");
  assertEquals(calls[0].method, "PUT");
  const form = formOf(calls[0].body);
  assertEquals(form.reservationID, "res1");
  assertEquals(form.propertyID, "1");
  assertEquals(form.status, "checked_in");
});

Deno.test("reservation-update: reservationID and propertyID are declared required", () => {
  const required = new Set(reservationUpdate.params!.filter((p) => p.required).map((p) => p.key));
  assertEquals(required.has("reservationID"), true);
  assertEquals(required.has("propertyID"), true);
});

Deno.test("reservation-update: is not idempotent — a room change re-prices the reservation", () => {
  assertEquals(reservationUpdate.idempotent, false);
});

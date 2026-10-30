import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-reservation.ts";

test("get-reservation: GETs /v1/reservations/{id} with no query parameters", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 13, guestName: "Andrew Peterson" })]);
  const reservation = await action.execute({ reservationId: 13 }, ctx) as { id: number };
  assertEquals(calls[0].url, "https://api.hostaway.com/v1/reservations/13");
  assertEquals(reservation.id, 13);
});

test("get-reservation: refuses a call without a reservation id", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "reservationId");
  assertEquals(calls.length, 0);
});

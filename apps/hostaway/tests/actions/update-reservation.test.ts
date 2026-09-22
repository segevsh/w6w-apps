import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/update-reservation.ts";

Deno.test("update-reservation: PUTs only the supplied fields and never listingMapId", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 117277 })]);
  await action.execute(
    { reservationId: 117277, phone: "+75125551212", forceOverbooking: 1 },
    ctx,
  );

  assertEquals(calls[0].url, "https://api.hostaway.com/v1/reservations/117277?forceOverbooking=1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { phone: "+75125551212" });
});

Deno.test("update-reservation: refuses an empty update instead of sending a bare PUT", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ reservationId: 1 }, ctx)),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});

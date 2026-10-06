import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import keyCodes from "../../actions/update-booking-key-codes.ts";

Deno.test("update-booking-key-codes: PUTs {rooms} and returns the echo", async () => {
  const rooms = [{ room_type_id: 6, key_code: "4821" }];
  const { ctx, calls } = mockCtx([{ body: { rooms } }]);
  const out = await keyCodes.execute({ bookingId: 3, rooms }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/reservations/bookings/3/keyCodes");
  assertEquals(JSON.parse(calls[0].body!), { rooms });
  assertEquals(out, { rooms });
});

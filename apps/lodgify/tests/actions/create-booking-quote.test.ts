import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import createBookingQuote from "../../actions/create-booking-quote.ts";

Deno.test("create-booking-quote: POSTs only the fields set and returns the new id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: 31 }]);
  const out = await createBookingQuote.execute({
    bookingId: 4,
    isPolicyActive: false,
    addOns: [{ add_on_id: 5, units: 1 }],
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/reservation/booking/4/quote");
  assertEquals(JSON.parse(calls[0].body!), {
    is_policy_active: false,
    add_ons: [{ add_on_id: 5, units: 1 }],
  });
  assertEquals(out, { id: 31 });
});

import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import getBookingQuote from "../../actions/get-booking-quote.ts";

Deno.test("get-booking-quote: GET /v1/reservation/booking/{id}/quote", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, status: "Agreed" } }]);
  const out = await getBookingQuote.execute({ bookingId: 4 }, ctx) as { status: string };
  assertEquals(pathOf(calls[0].url), "/v1/reservation/booking/4/quote");
  assertEquals(out.status, "Agreed");
});

import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import getPaymentLink from "../../actions/get-payment-link.ts";

Deno.test("get-payment-link: GET /v2/reservations/bookings/{id}/quote/paymentLink", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://pay.example/x" } }]);
  const link = await getPaymentLink.execute({ bookingId: 4 }, ctx) as { url: string };
  assertEquals(pathOf(calls[0].url), "/v2/reservations/bookings/4/quote/paymentLink");
  assertEquals(link.url, "https://pay.example/x");
});

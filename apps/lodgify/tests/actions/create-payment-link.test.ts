import { assertEquals } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import createPaymentLink from "../../actions/create-payment-link.ts";

Deno.test("create-payment-link: POSTs {amount} to the v2 paymentLink path", async () => {
  const { ctx, calls } = mockCtx([{ body: { succeeded: true } }]);
  const out = await createPaymentLink.execute({ bookingId: 4, amount: 150.5 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/reservations/bookings/4/quote/paymentLink");
  assertEquals(JSON.parse(calls[0].body!), { amount: 150.5 });
  assertEquals(out, { succeeded: true });
});

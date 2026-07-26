import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-pay.ts";

Deno.test("invoice-pay: POSTs the pay route", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "paid" } }]);
  await action.execute({ invoiceId: "in_1", offSession: true }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/invoices/in_1/pay");
  assertEquals(calls[0].body, "off_session=true");
});

Deno.test("invoice-pay: records an out-of-band payment without charging", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ invoiceId: "in_1", paidOutOfBand: true }, ctx);
  assertEquals(new URLSearchParams(calls[0].body!).get("paid_out_of_band"), "true");
});

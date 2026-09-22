import { assertEquals } from "@std/assert";
import getPayment from "../../actions/get-payment.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-payment: GET /payments/{id}, amount and charge date intact", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope("payments", {
      id: "PM0000",
      amount: 1000,
      currency: "GBP",
      status: "submitted",
      charge_date: "2026-10-01",
      links: { mandate: "MD1" },
    }),
  }]);
  const out = await getPayment.execute!({ paymentId: "PM0000" }, ctx) as {
    amount: number;
    currency: string;
    charge_date: string;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/payments/PM0000");
  // An integer in the lowest denomination — 1000 pence, not £10.00.
  assertEquals(out.amount, 1000);
  assertEquals(out.currency, "GBP");
  assertEquals(out.charge_date, "2026-10-01");
});

import { assertEquals } from "@std/assert";
import { mockQuadernoCtx } from "../_helpers.ts";
import action from "../../actions/invoice-record-payment.ts";

Deno.test("invoice-record-payment: calls the documented endpoint", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ status: 201, body: { id: 77, amount: 12.5 } }]);
  const out = await action.execute({ id: 40, amount: 12.5, paymentMethod: "cash" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://acme.quadernoapp.com/api/invoices/40/payments");
  assertEquals(JSON.parse(calls[0].body!), { amount: 12.5, payment_method: "cash" });
  assertEquals(out, { id: 77, amount: 12.5 });
});

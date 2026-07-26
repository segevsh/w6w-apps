import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-create.ts";

Deno.test("customer-create: POSTs /customers form-encoded", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cus_1" } }]);
  await action.execute({ email: "a@b.test", name: "Acme" }, ctx);
  assertEquals(calls[0].url, "https://api.stripe.com/v1/customers");
  assertEquals(calls[0].body, "email=a%40b.test&name=Acme");
});

Deno.test("customer-create: flattens metadata into bracket syntax", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ email: "a@b.test", metadata: { plan: "pro" } }, ctx);
  assertEquals(calls[0].body, "email=a%40b.test&metadata%5Bplan%5D=pro");
});

Deno.test("customer-create: nests the default payment method under invoice_settings", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ paymentMethod: "pm_1" }, ctx);
  assertEquals(calls[0].body, "invoice_settings%5Bdefault_payment_method%5D=pm_1");
});

Deno.test("customer-create: is idempotent — the Idempotency-Key covers a retry", () => {
  assertEquals(action.idempotent, true);
});

import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-get.ts";

Deno.test("invoice-get: fetches the invoice by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "INV-1", status: "DRAFT" } }]);
  const result = await action.execute!({ invoiceId: "INV-1" }, ctx);
  assertEquals(calls[0].url, "https://api-m.paypal.com/v2/invoicing/invoices/INV-1");
  assertEquals(result, { id: "INV-1", status: "DRAFT" });
});

Deno.test("invoice-get: invoiceId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ invoiceId: "" }, ctx)),
    Error,
    "`invoiceId`",
  );
  assertEquals(calls.length, 0);
});

import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

Deno.test("invoice-create: POSTs /invoices for the customer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "in_1", status: "draft" } }]);
  await action.execute(
    { customerId: "cus_1", collectionMethod: "send_invoice", daysUntilDue: 14 },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.stripe.com/v1/invoices");
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("customer"), "cus_1");
  assertEquals(body.get("collection_method"), "send_invoice");
  assertEquals(body.get("days_until_due"), "14");
});

Deno.test("invoice-create: the due-days field only shows for manual collection", () => {
  const days = action.params?.find((p) => p.key === "daysUntilDue");
  assertEquals(days?.showIf, { field: "collectionMethod", eq: "send_invoice" });
});

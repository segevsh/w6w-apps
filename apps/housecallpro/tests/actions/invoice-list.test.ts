import { assertEquals } from "@std/assert";
import invoiceList from "../../actions/invoice-list.ts";
import { mockCtx, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("invoice-list: calls GET /invoices", async () => {
  const { ctx, calls } = mockCtx([{ body: page("invoices", [{ id: "in1" }]) }]);
  const out = await invoiceList.execute({ amountDueMin: 1 }, ctx);

  assertEquals(pathOf(calls[0].url), "/invoices");
  assertEquals(queryOf(calls[0].url), { amount_due_min: "1" });
  assertEquals(out.items, [{ id: "in1" }]);
});

Deno.test("invoice-list: status, customer_uuid and payment_method all travel bracketed", async () => {
  const { ctx, calls } = mockCtx([{ body: page("invoices", []) }]);
  await invoiceList.execute({
    status: ["open", "pending_payment"],
    customerUuid: "cus_1,cus_2",
    paymentMethod: ["credit_card"],
  }, ctx);

  assertEquals(queryAll(calls[0].url, "status[]"), ["open", "pending_payment"]);
  assertEquals(queryAll(calls[0].url, "customer_uuid[]"), ["cus_1", "cus_2"]);
  assertEquals(queryAll(calls[0].url, "payment_method[]"), ["credit_card"]);
});

Deno.test("invoice-list: the three date ranges keep their own parameter names", async () => {
  const { ctx, calls } = mockCtx([{ body: page("invoices", []) }]);
  await invoiceList.execute({
    createdAtMin: "2026-01-01",
    dueAtMax: "2026-02-01",
    paidAtMin: "2026-01-15",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    created_at_min: "2026-01-01",
    due_at_max: "2026-02-01",
    paid_at_min: "2026-01-15",
  });
});

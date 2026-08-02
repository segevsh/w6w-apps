import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/payment-create.ts";

Deno.test("payment-create: POSTs /payment with CustomerRef and TotalAmt", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Payment: { Id: "1" } } }]);
  await action.execute({ customerId: "42", totalAmount: 100 }, ctx);
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/payment?minorversion=75",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    CustomerRef: { value: "42" },
    TotalAmt: 100,
  });
});

Deno.test("payment-create: merges additionalFields (e.g. LinkedTxn)", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: {} }]);
  await action.execute({
    customerId: "42",
    totalAmount: 100,
    additionalFields: { Line: [{ Amount: 100, LinkedTxn: [{ TxnId: "145", TxnType: "Invoice" }] }] },
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.Line, [{ Amount: 100, LinkedTxn: [{ TxnId: "145", TxnType: "Invoice" }] }]);
});

import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/bill-create.ts";

const LINES = [{
  DetailType: "AccountBasedExpenseLineDetail",
  Amount: 100,
  Description: "Office supplies",
  AccountBasedExpenseLineDetail: { AccountRef: { value: "7" } },
}];

Deno.test("bill-create: POSTs /bill with VendorRef and Line", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Bill: { Id: "1" } } }]);
  await action.execute({ vendorId: "9", lines: LINES }, ctx);
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/bill?minorversion=75",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    VendorRef: { value: "9" },
    Line: LINES,
  });
});

import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/estimate-create.ts";

const LINES = [{
  DetailType: "SalesItemLineDetail",
  Amount: 250,
  Description: "Design work",
  SalesItemLineDetail: { ItemRef: { value: "1" } },
}];

Deno.test("estimate-create: POSTs /estimate with CustomerRef and Line", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Estimate: { Id: "1" } } }]);
  await action.execute({ customerId: "42", lines: LINES }, ctx);
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/estimate?minorversion=75",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    CustomerRef: { value: "42" },
    Line: LINES,
  });
});

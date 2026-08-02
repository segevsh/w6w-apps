import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/customer-get.ts";

Deno.test("customer-get: GETs /customer/{id}", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Customer: { Id: "1" } } }]);
  await action.execute({ customerId: "1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/customer/1?minorversion=75",
  );
  assertEquals(calls[0].method, "GET");
});

import { assertEquals } from "@std/assert";
import { mockQuickBooksCtx } from "../_helpers.ts";
import action from "../../actions/vendor-get.ts";

Deno.test("vendor-get: GETs /vendor/{id}", async () => {
  const { ctx, calls } = mockQuickBooksCtx([{ body: { Vendor: { Id: "1" } } }]);
  await action.execute({ vendorId: "1" }, ctx);
  assertEquals(
    calls[0].url,
    "https://quickbooks.api.intuit.com/v3/company/123145/vendor/1?minorversion=75",
  );
});

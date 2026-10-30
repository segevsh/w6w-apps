import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import { mockSalesforceCtx } from "../_helpers.ts";
import action from "../../actions/query-more.ts";

test("query-more: follows the locator verbatim", async () => {
  const { ctx, calls } = mockSalesforceCtx([{ body: { done: true, records: [] } }]);
  await action.execute({ nextRecordsUrl: "/services/data/v60.0/query/01g-2000" }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.my.salesforce.com/services/data/v60.0/query/01g-2000",
  );
});

test("query-more: refuses anything that is not a Salesforce locator", () => {
  const { ctx, calls } = mockSalesforceCtx();
  assertThrows(
    () => action.execute({ nextRecordsUrl: "https://evil.test/steal" }, ctx),
    Error,
    "must be the path Salesforce returned",
  );
  assertEquals(calls.length, 0);
});

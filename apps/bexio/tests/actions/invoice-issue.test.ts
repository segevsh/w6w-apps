import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-issue.ts";

test("invoice-issue: POSTs to /2.0/kb_invoice/{id}/issue with an empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  const result = await action.execute!({ invoiceId: 7 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/kb_invoice/7/issue");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(result, { success: true });
});

test("invoice-issue: is not idempotent — issuing twice is not the same as once", () => {
  assertEquals(action.idempotent, false);
});

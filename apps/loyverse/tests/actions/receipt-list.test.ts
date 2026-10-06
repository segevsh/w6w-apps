import { assertEquals } from "@std/assert";
import action from "../../actions/receipt-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("receipt-list: GET /receipts maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { receipts: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({
    receiptNumbers: "1-1001,1-1002",
    sinceReceiptNumber: "1-1000",
    storeId: "s1",
    source: "API",
    limit: 20,
  }, ctx) as { receipts: unknown[]; cursor?: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/receipts");
  assertEquals(queryOf(calls[0].url), {
    receipt_numbers: "1-1001,1-1002",
    since_receipt_number: "1-1000",
    store_id: "s1",
    source: "API",
    limit: "20",
  });
  assertEquals(out.receipts.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("receipt-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { receipts: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});

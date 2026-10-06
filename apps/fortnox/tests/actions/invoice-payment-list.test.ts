import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-payment-list.ts";

Deno.test("invoice-payment-list: GET /3/invoicepayments with its query", async () => {
  const reply = { "InvoicePayments": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const result = await action.execute!({
    "page": 7,
    "limit": 7,
    "invoiceNumber": "invoiceNumber-v",
    "sortBy": "paymentdate",
    "lastModified": "lastModified-v",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin, "https://api.fortnox.se");
  assertEquals(url.pathname, "/3/invoicepayments");
  assertEquals(Object.fromEntries(url.searchParams), {
    "page": "7",
    "limit": "7",
    "invoicenumber": "invoiceNumber-v",
    "sortby": "paymentdate",
    "lastmodified": "lastModified-v",
  });
  assertEquals(calls[0].body, null);
  assertEquals(result, reply);

  // Unset params must never reach the wire as empty query keys.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({} as never, bare.ctx);
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

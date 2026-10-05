import { assertEquals, assertRejects } from "@std/assert";
import listPurchases from "../../actions/list-purchases.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "listPurchases";
const DATA = { "ok": "Y" };

Deno.test("list-purchases: calls listPurchases with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await listPurchases.execute({}, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), {});
  assertEquals(out, DATA);
});

Deno.test("list-purchases: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await listPurchases.execute({
    "from": "-3d",
    "to": "now",
    "role": "vendor",
    "product_id": "123,456",
    "email": "a@b.com",
    "first_name": "Ann",
    "last_name": "Lee",
    "has_affiliate": true,
    "affiliate_name": "aff1",
    "order_type": "live",
    "pay_method": "paypal",
    "billing_type": "single_payment",
    "transaction_type": "payment",
    "currency": "EUR",
    "search_purchase_id": "A1,B2",
    "sort_by": "date",
    "sort_order": "desc",
    "load_transactions": true,
    "page_no": 2,
    "page_size": 50,
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "from": "-3d",
    "to": "now",
    "search[role]": "vendor",
    "search[product_id]": "123,456",
    "search[email]": "a@b.com",
    "search[first_name]": "Ann",
    "search[last_name]": "Lee",
    "search[has_affiliate]": "Y",
    "search[affiliate_name]": "aff1",
    "search[order_type]": "live",
    "search[pay_method]": "paypal",
    "search[billing_type]": "single_payment",
    "search[transaction_type]": "payment",
    "search[currency]": "EUR",
    "search[purchase_id]": "A1,B2",
    "sort_by": "date",
    "sort_order": "desc",
    "load_transactions": "Y",
    "page_no": "2",
    "page_size": "50",
  });
});

Deno.test("list-purchases: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await listPurchases.execute({}, ctx),
    Error,
    "The API key is invalid.",
  );
});

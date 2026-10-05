import { assertEquals, assertRejects } from "@std/assert";
import listTransactions from "../../actions/list-transactions.ts";
import { envelope, errorEnvelope, fieldsOf, fnOf, mockCtx } from "../_helpers.ts";

const FN = "listTransactions";
const DATA = { "ok": "Y" };

Deno.test("list-transactions: calls listTransactions with GET and returns the data payload", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  const out = await listTransactions.execute({}, ctx);
  assertEquals(fnOf(calls[0].url), FN);
  assertEquals(calls[0].method, "GET");
  assertEquals(fieldsOf(calls[0]), {});
  assertEquals(out, DATA);
});

Deno.test("list-transactions: sends every optional field under the vendor's wire name", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(DATA) }]);
  await listTransactions.execute({
    "from": "-3d",
    "to": "now",
    "email": "a@b.com",
    "product_id": "123",
    "transaction_type": "payment",
    "sort_by": "date",
    "sort_order": "desc",
    "page_no": 2,
    "page_size": 50,
  }, ctx);
  assertEquals(fieldsOf(calls[0]), {
    "from": "-3d",
    "to": "now",
    "search[email]": "a@b.com",
    "search[product_id]": "123",
    "search[transaction_type]": "payment",
    "sort_by": "date",
    "sort_order": "desc",
    "page_no": "2",
    "page_size": "50",
  });
});

Deno.test("list-transactions: surfaces the vendor error envelope even on HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope("The API key is invalid.", 2) }]);
  await assertRejects(
    async () => await listTransactions.execute({}, ctx),
    Error,
    "The API key is invalid.",
  );
});

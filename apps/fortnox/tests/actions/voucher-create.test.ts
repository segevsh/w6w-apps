import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/voucher-create.ts";

Deno.test("voucher-create: POST /3/vouchers with a wrapped body", async () => {
  const reply = { "Voucher": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  const result = await action.execute!({
    "voucherSeries": "voucherSeries-v",
    "transactionDate": "transactionDate-v",
    "description": "description-v",
    "year": 7,
    "voucherRows": [{ "ArticleNumber": "A1", "Price": 100 }],
    "comments": "comments-v",
    "referenceNumber": "referenceNumber-v",
    "referenceType": "INVOICE",
    "additionalFields": { "Comments": "extra" },
    "financialYear": "financialYear-v",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/3/vouchers");
  assertEquals(Object.fromEntries(url.searchParams), { "financialyear": "financialYear-v" });
  assertEquals(JSON.parse(calls[0].body!), {
    Voucher: {
      "VoucherSeries": "voucherSeries-v",
      "TransactionDate": "transactionDate-v",
      "Description": "description-v",
      "Year": 7,
      "VoucherRows": [{ "ArticleNumber": "A1", "Price": 100 }],
      "Comments": "extra",
      "ReferenceNumber": "referenceNumber-v",
      "ReferenceType": "INVOICE",
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, reply);

  // Optional params that were not set are left out of the payload entirely.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!(
    {
      "voucherSeries": "voucherSeries-v",
      "transactionDate": "transactionDate-v",
      "description": "description-v",
      "year": 7,
      "voucherRows": [{ "ArticleNumber": "A1", "Price": 100 }],
    } as never,
    bare.ctx,
  );
  assertEquals(JSON.parse(bare.calls[0].body!), {
    Voucher: {
      "VoucherSeries": "voucherSeries-v",
      "TransactionDate": "transactionDate-v",
      "Description": "description-v",
      "Year": 7,
      "VoucherRows": [{ "ArticleNumber": "A1", "Price": 100 }],
    },
  });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("voucher-create: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        {
          "voucherSeries": "voucherSeries-v",
          "transactionDate": "transactionDate-v",
          "description": "description-v",
          "year": 7,
          "voucherRows": [{ "ArticleNumber": "A1", "Price": 100 }],
          "additionalFields": "[1]",
        } as never,
        ctx,
      ),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

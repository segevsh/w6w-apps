import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/article-create.ts";

Deno.test("article-create: POST /3/articles with a wrapped body", async () => {
  const reply = { "Article": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  const result = await action.execute!({
    "description": "description-v",
    "articleNumber": "articleNumber-v",
    "type": "STOCK",
    "salesPrice": 7,
    "purchasePrice": 7,
    "unit": "unit-v",
    "vat": 7,
    "salesAccount": 7,
    "purchaseAccount": 7,
    "ean": "ean-v",
    "manufacturer": "manufacturer-v",
    "supplierNumber": "supplierNumber-v",
    "active": true,
    "note": "note-v",
    "additionalFields": { "Comments": "extra" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/3/articles");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    Article: {
      "Description": "description-v",
      "ArticleNumber": "articleNumber-v",
      "Type": "STOCK",
      "SalesPrice": 7,
      "PurchasePrice": 7,
      "Unit": "unit-v",
      "VAT": 7,
      "SalesAccount": 7,
      "PurchaseAccount": 7,
      "EAN": "ean-v",
      "Manufacturer": "manufacturer-v",
      "SupplierNumber": "supplierNumber-v",
      "Active": true,
      "Note": "note-v",
      "Comments": "extra",
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, reply);

  // Optional params that were not set are left out of the payload entirely.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({} as never, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), { Article: {} });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("article-create: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ "additionalFields": "[1]" } as never, ctx),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

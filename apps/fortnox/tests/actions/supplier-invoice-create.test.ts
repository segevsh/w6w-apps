import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/supplier-invoice-create.ts";

Deno.test("supplier-invoice-create: POST /3/supplierinvoices with a wrapped body", async () => {
  const reply = { "SupplierInvoice": { "Id": 1 } };
  const { ctx, calls } = mockCtx([{ status: 201, body: reply }]);
  const result = await action.execute!({
    "supplierNumber": "supplierNumber-v",
    "invoiceNumber": "invoiceNumber-v",
    "invoiceDate": "invoiceDate-v",
    "dueDate": "dueDate-v",
    "total": 7,
    "vat": 7,
    "currency": "currency-v",
    "vatType": "NORMAL",
    "ocr": "ocr-v",
    "project": "project-v",
    "costCenter": "costCenter-v",
    "comments": "comments-v",
    "supplierInvoiceRows": [{ "ArticleNumber": "A1", "Price": 100 }],
    "additionalFields": { "Comments": "extra" },
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/3/supplierinvoices");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    SupplierInvoice: {
      "SupplierNumber": "supplierNumber-v",
      "InvoiceNumber": "invoiceNumber-v",
      "InvoiceDate": "invoiceDate-v",
      "DueDate": "dueDate-v",
      "Total": 7,
      "VAT": 7,
      "Currency": "currency-v",
      "VATType": "NORMAL",
      "OCR": "ocr-v",
      "Project": "project-v",
      "CostCenter": "costCenter-v",
      "Comments": "extra",
      "SupplierInvoiceRows": [{ "ArticleNumber": "A1", "Price": 100 }],
    },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, reply);

  // Optional params that were not set are left out of the payload entirely.
  const bare = mockCtx([{ body: reply }]);
  await action.execute!({ "supplierNumber": "supplierNumber-v" } as never, bare.ctx);
  assertEquals(JSON.parse(bare.calls[0].body!), {
    SupplierInvoice: { "SupplierNumber": "supplierNumber-v" },
  });
  assertEquals(Object.fromEntries(new URL(bare.calls[0].url).searchParams), {});
});

Deno.test("supplier-invoice-create: rejects an additionalFields that is not a JSON object", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { "supplierNumber": "supplierNumber-v", "additionalFields": "[1]" } as never,
        ctx,
      ),
    Error,
    "additionalFields must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

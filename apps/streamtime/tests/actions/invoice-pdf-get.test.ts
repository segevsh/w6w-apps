import { assertEquals } from "@std/assert";
import invoicePdfGet from "../../actions/invoice-pdf-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const PDF = "%PDF-1.7\ninvoice bytes\n";

Deno.test("invoice-pdf-get: base64-encodes the invoice PDF", async () => {
  const { ctx, calls } = mockCtx([
    { body: PDF, headers: { "content-type": "application/pdf" } },
  ]);
  const result = await invoicePdfGet.execute({ invoiceId: 3456 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/invoices/3456/pdf");
  assertEquals(result.encoding, "base64");
  assertEquals(atob(result.content as string), PDF);
});

/** When the vendor omits the content type, the action still reports something true. */
Deno.test("invoice-pdf-get: a missing content type falls back to application/pdf", async () => {
  const { ctx } = mockCtx([{ body: PDF, headers: { "content-type": "" } }]);
  const result = await invoicePdfGet.execute({ invoiceId: 3456 }, ctx) as Record<string, unknown>;
  assertEquals(result.contentType, "application/pdf");
});

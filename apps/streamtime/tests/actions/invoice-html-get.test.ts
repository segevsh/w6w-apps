import { assertEquals } from "@std/assert";
import invoiceHtmlGet from "../../actions/invoice-html-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-html-get: returns the HTML document as a string", async () => {
  const { ctx, calls } = mockCtx([
    { body: "<html>INV-2025-001</html>", headers: { "content-type": "text/html; charset=UTF-8" } },
  ]);
  const result = await invoiceHtmlGet.execute({ invoiceId: 3456 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/invoices/3456/html");
  assertEquals(result.html, "<html>INV-2025-001</html>");
  assertEquals(result.contentType, "text/html; charset=UTF-8");
});

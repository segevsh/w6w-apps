import { assertEquals } from "@std/assert";
import quoteHtmlGet from "../../actions/quote-html-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quote-html-get: returns text/html as a string, not a parse error", async () => {
  const { ctx, calls } = mockCtx([
    { body: "<html><body>Quote</body></html>", headers: { "content-type": "text/html" } },
  ]);
  const result = await quoteHtmlGet.execute({ quoteId: 201 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/quotes/201/html");
  assertEquals(result.html, "<html><body>Quote</body></html>");
  assertEquals(result.contentType, "text/html");
});

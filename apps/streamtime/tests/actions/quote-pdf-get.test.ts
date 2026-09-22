import { assert, assertEquals } from "@std/assert";
import quotePdfGet from "../../actions/quote-pdf-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const PDF = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n";

Deno.test("quote-pdf-get: base64-encodes the PDF bytes", async () => {
  const { ctx, calls } = mockCtx([
    { body: PDF, headers: { "content-type": "application/pdf" } },
  ]);
  const result = await quotePdfGet.execute({ quoteId: 201 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/quotes/201/pdf");
  assertEquals(result.encoding, "base64");
  assertEquals(result.contentType, "application/pdf");
  assertEquals(atob(result.content as string), PDF);
});

Deno.test("quote-pdf-get: a PDF is not JSON, and nothing tries to parse it", async () => {
  const { ctx } = mockCtx([{ body: PDF, headers: { "content-type": "application/pdf" } }]);
  const result = await quotePdfGet.execute({ quoteId: 201 }, ctx) as Record<string, unknown>;
  assert(typeof result.content === "string");
  assert((result.content as string).length > 0);
});

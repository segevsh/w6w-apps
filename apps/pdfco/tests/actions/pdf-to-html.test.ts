import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import pdfToHtml from "../../actions/pdf-to-html.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("pdf-to-html: posts to /v1/pdf/convert/to/html and returns the HTML body", async () => {
  const { ctx, calls } = mockCtx([{ body: { body: "<h1>hi</h1>", pageCount: 1 } }]);
  const out = await pdfToHtml.execute({ url: "https://example.com/a.pdf" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/pdf/convert/to/html");
  assertEquals(out.body, "<h1>hi</h1>");
});

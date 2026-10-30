import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import pdfFind from "../../actions/pdf-find.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("pdf-find: posts to /v1/pdf/find with camelCase searchString", async () => {
  const { ctx, calls } = mockCtx([{ body: { body: [{ page: 0, text: "Invoice" }] } }]);
  const out = await pdfFind.execute(
    { url: "https://example.com/a.pdf", searchString: "Invoice" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v1/pdf/find");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.searchString, "Invoice");
  assertEquals("searchstring" in sent, false);
  assertEquals((out.body as unknown[])?.length, 1);
});

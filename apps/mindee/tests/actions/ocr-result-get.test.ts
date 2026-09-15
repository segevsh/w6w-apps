import { assertEquals } from "@std/assert";
import ocrResultGet from "../../actions/ocr-result-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ocr-result-get: fetches the ocr results route, pages with words and content", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        inference: {
          result: {
            pages: [{
              content: "hello world",
              words: [{ content: "hello", polygon: [[0, 0], [1, 0], [1, 1]] }],
            }],
          },
        },
      },
    },
  ]);
  const result = await ocrResultGet.execute({ inferenceId: "abc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/products/ocr/results/abc");
  assertEquals(
    (result as { inference: { result: { pages: Array<{ content: string }> } } }).inference.result
      .pages[0].content,
    "hello world",
  );
});

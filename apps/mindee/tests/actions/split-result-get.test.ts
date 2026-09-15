import { assertEquals } from "@std/assert";
import splitResultGet from "../../actions/split-result-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("split-result-get: fetches the split results route, page ranges and document type", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        inference: { result: { splits: [{ page_range: [0, 2], document_type: "INVOICE" }] } },
      },
    },
  ]);
  const result = await splitResultGet.execute({ inferenceId: "abc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/products/split/results/abc");
  assertEquals(
    (result as { inference: { result: { splits: Array<{ page_range: number[] }> } } }).inference
      .result.splits[0]
      .page_range,
    [0, 2],
  );
});

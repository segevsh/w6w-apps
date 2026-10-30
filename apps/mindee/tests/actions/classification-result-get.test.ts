import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import classificationResultGet from "../../actions/classification-result-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("classification-result-get: fetches the classification results route by id", async () => {
  const { ctx, calls } = mockCtx([
    { body: { inference: { result: { classification: { document_type: "INVOICE" } } } } },
  ]);
  const result = await classificationResultGet.execute({ inferenceId: "abc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/products/classification/results/abc");
  assertEquals(
    (result as { inference: { result: { classification: { document_type: string } } } }).inference
      .result
      .classification.document_type,
    "INVOICE",
  );
});

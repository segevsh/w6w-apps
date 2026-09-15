import { assert, assertEquals } from "@std/assert";
import extractionResultGet from "../../actions/extraction-result-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const INFERENCE_ID = "018f1e2a-0000-7000-8000-000000000001";

Deno.test("extraction-result-get: fetches the extraction results route by id", async () => {
  const { ctx, calls } = mockCtx([
    { body: { inference: { id: INFERENCE_ID, result: { fields: { total: { value: 42 } } } } } },
  ]);
  const result = await extractionResultGet.execute({ inferenceId: INFERENCE_ID }, ctx);

  assertEquals(pathOf(calls[0].url), `/v2/products/extraction/results/${INFERENCE_ID}`);
  assertEquals(
    (result as { inference: { result: { fields: { total: { value: number } } } } }).inference.result
      .fields.total
      .value,
    42,
  );
});

Deno.test("extraction-result-get: a not-yet-processed job answers 404 and throws", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: errorBody(404, "404-002", "Not Found", "The requested resource is not ready for use."),
    },
  ]);
  try {
    await extractionResultGet.execute({ inferenceId: INFERENCE_ID }, ctx);
    throw new Error("expected execute() to reject");
  } catch (e) {
    assert(/404-002/.test((e as Error).message), (e as Error).message);
  }
});

Deno.test("extraction-result-get: encodes the id into the path", async () => {
  const { ctx, calls } = mockCtx([{ body: { inference: {} } }]);
  await extractionResultGet.execute({ inferenceId: "has a space" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/products/extraction/results/has%20a%20space");
});

import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import ocrEnqueue from "../../actions/ocr-enqueue.ts";
import { jobResponse, mockCtx, pathOf } from "../_helpers.ts";

const MODEL_ID = "018f1e2a-0000-7000-8000-0000000000dd";

test("ocr-enqueue: posts to the ocr enqueue route using the UtilityEnqueueForm shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: jobResponse() }]);
  await ocrEnqueue.execute({ modelId: MODEL_ID, url: "https://example.com/a.pdf" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/products/ocr/enqueue");
  assertEquals(calls[0].form?.model_id, [MODEL_ID]);
});

test("ocr-enqueue: throws when neither file nor url is given", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => ocrEnqueue.execute({ modelId: MODEL_ID }, ctx), Error);
});

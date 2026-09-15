import { assertEquals, assertThrows } from "@std/assert";
import classificationEnqueue from "../../actions/classification-enqueue.ts";
import { jobResponse, mockCtx, pathOf } from "../_helpers.ts";

const MODEL_ID = "018f1e2a-0000-7000-8000-0000000000bb";

Deno.test("classification-enqueue: posts to the classification enqueue route", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: jobResponse() }]);
  await classificationEnqueue.execute({ modelId: MODEL_ID, url: "https://example.com/a.pdf" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/products/classification/enqueue");
  assertEquals(calls[0].form?.model_id, [MODEL_ID]);
  assertEquals(calls[0].form?.url, ["https://example.com/a.pdf"]);
});

Deno.test("classification-enqueue: carries none of extraction's extra options", () => {
  const keys = new Set(classificationEnqueue.params?.map((p) => p.key));
  for (const extra of ["rawText", "polygon", "confidence", "rag", "textContext", "dataSchema"]) {
    if (keys.has(extra)) throw new Error(`unexpected extraction-only param: ${extra}`);
  }
});

Deno.test("classification-enqueue: throws when neither file nor url is given", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => classificationEnqueue.execute({ modelId: MODEL_ID }, ctx), Error);
});

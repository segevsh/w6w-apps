import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import cropEnqueue from "../../actions/crop-enqueue.ts";
import { jobResponse, mockCtx, pathOf } from "../_helpers.ts";

const MODEL_ID = "018f1e2a-0000-7000-8000-0000000000cc";

test("crop-enqueue: posts to the crop enqueue route", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: jobResponse() }]);
  await cropEnqueue.execute({ modelId: MODEL_ID, url: "https://example.com/a.pdf" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/products/crop/enqueue");
});

test("crop-enqueue: throws when neither file nor url is given", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => cropEnqueue.execute({ modelId: MODEL_ID }, ctx), Error);
});

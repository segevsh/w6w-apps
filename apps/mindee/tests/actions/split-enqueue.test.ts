import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import splitEnqueue from "../../actions/split-enqueue.ts";
import { jobResponse, mockCtx, pathOf } from "../_helpers.ts";

const MODEL_ID = "018f1e2a-0000-7000-8000-0000000000ee";

test("split-enqueue: posts to the split enqueue route", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: jobResponse() }]);
  await splitEnqueue.execute({ modelId: MODEL_ID, url: "https://example.com/a.pdf" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/products/split/enqueue");
});

test("split-enqueue: throws when neither file nor url is given", () => {
  const { ctx } = mockCtx([]);
  assertThrows(() => splitEnqueue.execute({ modelId: MODEL_ID }, ctx), Error);
});

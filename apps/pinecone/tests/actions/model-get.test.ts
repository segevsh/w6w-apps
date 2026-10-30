import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/model-get.ts";

test("model-get: reads one model", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { model: "multilingual-e5-large" } }]);
  await action.execute!({ modelName: "multilingual-e5-large" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/models/multilingual-e5-large");
});

test("model-get: a missing name is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "modelName");
});

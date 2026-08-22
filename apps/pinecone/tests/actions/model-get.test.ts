import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/model-get.ts";

Deno.test("model-get: reads one model", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { model: "multilingual-e5-large" } }]);
  await action.execute!({ modelName: "multilingual-e5-large" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/models/multilingual-e5-large");
});

Deno.test("model-get: a missing name is refused", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({}, ctx), Error, "modelName");
});

import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { BASE, display } from "./_shared.ts";
import action from "../../actions/model-delete.ts";

test("model-delete: sends DELETE /api/delete with the model in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }], { display });
  const result = await action.execute!({ model: "old:7b" }, ctx);
  assertEquals(calls[0].url, `${BASE}/api/delete`);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(JSON.parse(calls[0].body!), { model: "old:7b" });
  assertEquals(result, { deleted: true, model: "old:7b" });
});

test("model-delete: a missing model is an error, not a silent success", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "model 'x' not found" } }], { display });
  const err = await assertRejects(async () => await action.execute!({ model: "x" }, ctx));
  assert(/not found/.test((err as Error).message));
});

test("model-delete: requires a model", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`model` is required");
});

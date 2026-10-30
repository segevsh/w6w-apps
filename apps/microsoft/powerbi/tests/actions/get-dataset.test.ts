import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-dataset.ts";

test("get-dataset: GETs [/groups/{id}]/datasets/{datasetId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1", isRefreshable: true } }]);
  const out = await action.execute({ datasetId: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/datasets/d1");
  assertEquals(out.isRefreshable, true);
});

test("get-dataset: a Workspace ID scopes the call", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ groupId: "w1", datasetId: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/datasets/d1");
});

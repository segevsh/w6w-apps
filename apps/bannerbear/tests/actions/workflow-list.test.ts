import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import workflowList from "../../actions/workflow-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("workflow-list: GET /workflows", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "wf1", name: "Social pack" }] }]);
  const out = await workflowList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/workflows");
  assertEquals(out, [{ uid: "wf1", name: "Social pack" }]);
});

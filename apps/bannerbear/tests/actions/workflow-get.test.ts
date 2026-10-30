import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import workflowGet from "../../actions/workflow-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("workflow-get: GET /workflows/{uid}", async () => {
  const { ctx, calls } = mockCtx([
    { body: { uid: "wf1", inputs: { headline: { type: "string", required: true } }, steps: [] } },
  ]);
  const out = await workflowGet.execute({ uid: "wf1" }, ctx) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/workflows/wf1");
  assertEquals(
    (out.inputs as Record<string, unknown>).headline,
    { type: "string", required: true },
  );
});

test("workflow-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => workflowGet.execute({ uid: "" }, ctx));
});

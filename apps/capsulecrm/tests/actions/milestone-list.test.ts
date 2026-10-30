import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/milestone-list.ts";

test("milestone-list: GETs /pipelines/{pipelineId}/milestones, not the legacy /milestones", async () => {
  const { ctx, calls } = mockCtx([{ body: { milestones: [{ id: 1, name: "New" }] } }]);
  const out = await action.execute({ pipelineId: 7 }, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/pipelines/7/milestones");
  assertEquals(out, { milestones: [{ id: 1, name: "New" }], nextPage: undefined });
});

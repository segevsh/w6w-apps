import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-move.ts";
import { mockCtx } from "../_helpers.ts";

const base = {
  companyId: "c1",
  positionId: "p1",
  candidateId: "k1",
  targetPositionId: "p2",
  targetStageId: "applied",
};

Deno.test("candidate-move: POSTs the target; stage actions are omitted unless set", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "k1" } }]);
  const out = await action.execute!(base, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/position/p1/candidate/k1/move");
  assertEquals(JSON.parse(calls[0].body!), {
    target_position_id: "p2",
    target_stage_id: "applied",
  });
  assertEquals(out, { _id: "k1" });
});

Deno.test("candidate-move: an explicit false is sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ ...base, stageActionsEnabled: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).stage_actions_enabled, false);
});

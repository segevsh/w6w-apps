import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-set-stage.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("candidate-set-stage: PUTs stage_id and handles the empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!(
    { companyId: "c1", positionId: "p1", candidateId: "k1", stageId: "interview" },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/position/p1/candidate/k1/stage");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { stage_id: "interview" });
  assertEquals(out, { ok: true, stageId: "interview" });
});

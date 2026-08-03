import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import applyActionPlan from "../../actions/apply-action-plan.ts";

Deno.test("apply-action-plan: POSTs /actionPlansPeople with both required ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await applyActionPlan.execute({ personId: 15013, actionPlanId: 6 }, ctx);
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/actionPlansPeople");
  assertEquals(JSON.parse(calls[0].body!), { personId: 15013, actionPlanId: 6 });
  assertEquals(
    (applyActionPlan.params ?? []).filter((p) => p.required).map((p) => p.key),
    ["personId", "actionPlanId"],
  );
  assertEquals(applyActionPlan.idempotent, false);
});

/** The vendor has flagged both endpoints for deprecation; that must stay visible. */

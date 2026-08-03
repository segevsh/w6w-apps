import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import listActionPlans from "../../actions/list-action-plans.ts";
import applyActionPlan from "../../actions/apply-action-plan.ts";

Deno.test("list-action-plans: GETs /actionPlans with status and ids", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _metadata: { collection: "actionPlans" }, actionPlans: [{ id: 6 }] },
  }]);
  const result = await run<{ records: unknown[] }>(
    listActionPlans,
    { status: "Active", ids: "287564,67484" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/actionPlans");
  assertEquals(url.searchParams.get("status"), "Active");
  assertEquals(url.searchParams.get("ids"), "287564,67484");
  assertEquals(result.records.length, 1);
});

/** The vendor has flagged both endpoints for deprecation; that must stay visible. */
Deno.test("action plans: both actions carry the deprecation notice", () => {
  assert(/deprecat/i.test(listActionPlans.description!), listActionPlans.description);
  assert(/deprecat/i.test(applyActionPlan.description!), applyActionPlan.description);
});

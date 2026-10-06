import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/action-plan-apply-traditional.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("action-plan-apply-traditional: PUT /zapier/applyTraditionalActionPlan with the plan, lead and optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({
    actionPlanId: 12,
    leadIdOrEmailOrPhone: "a@b.com",
    note: "n",
    startNextDayIfAppliedAfter: "Before 5pm",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/zapier/applyTraditionalActionPlan");
  assertEquals(bodyOf(calls[0]), {
    actionPlanId: 12,
    leadIdOrEmailOrPhone: "a@b.com",
    note: "n",
    startNextDayIfAppliedAfter: "Before 5pm",
  });
});

Deno.test("action-plan-apply-traditional: unset optionals are not sent; a failure envelope rejects", async () => {
  const ok = mockCtx([{ body: { success: true } }]);
  await action.execute({ actionPlanId: 1, leadIdOrEmailOrPhone: "5" }, ok.ctx);
  assertEquals(bodyOf(ok.calls[0]), { actionPlanId: 1, leadIdOrEmailOrPhone: "5" });
  const bad = mockCtx([{ status: 400, body: errorBody("Action plan not found") }]);
  await assertRejects(
    () => Promise.resolve(action.execute({ actionPlanId: 1, leadIdOrEmailOrPhone: "5" }, bad.ctx)),
    Error,
    "Action plan not found",
  );
});

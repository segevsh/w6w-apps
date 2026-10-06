import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/action-plan-stop-traditional.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("action-plan-stop-traditional: PUT /zapier/stopTraditionalActionPlan with the plan, lead and optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({
    actionPlanId: 12,
    leadIdOrEmailOrPhone: "a@b.com",
    note: "n",
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/zapier/stopTraditionalActionPlan");
  assertEquals(bodyOf(calls[0]), {
    actionPlanId: 12,
    leadIdOrEmailOrPhone: "a@b.com",
    note: "n",
  });
});

Deno.test("action-plan-stop-traditional: unset optionals are not sent; a failure envelope rejects", async () => {
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

import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-expense-rule.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

Deno.test("update-expense-rule: posts update/expenseRules including a ruleID of 0", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200 } }]);
  const out = await action.execute!({
    policyID: "P",
    employeeEmail: "e@d.com",
    ruleID: 0,
    tag: "Tag Name",
  }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "update",
    inputSettings: {
      type: "expenseRules",
      policyID: "P",
      employeeEmail: "e@d.com",
      ruleID: 0,
      actions: { tag: "Tag Name" },
    },
  });
  assertEquals(out, { response: { responseCode: 200 } });
});

Deno.test("update-expense-rule: validates the rule id and the actions locally", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await action.execute!(
        { policyID: "P", employeeEmail: "e@d.com", ruleID: 1.5, tag: "t" },
        ctx,
      ),
    Error,
    "ruleID must be an integer",
  );
  await assertRejects(
    async () => await action.execute!({ policyID: "P", employeeEmail: "e@d.com", ruleID: 1 }, ctx),
    Error,
    "at least one",
  );
  await assertRejects(
    async () =>
      await action.execute!({ policyID: "", employeeEmail: "e@d.com", ruleID: 1, tag: "t" }, ctx),
    Error,
    "policyID is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-expense-rule: a defaultBillable of false is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200 } }]);
  await action.execute!({
    policyID: "P",
    employeeEmail: "e@d.com",
    ruleID: 3,
    defaultBillable: false,
  }, ctx);
  assertEquals(sent(calls[0]).job.inputSettings.actions, { defaultBillable: false });
});

Deno.test("update-expense-rule: surfaces vendor errors", async () => {
  const { ctx } = mockCtx([{ body: { responseMessage: "Rule not found", responseCode: 404 } }]);
  await assertRejects(
    async () =>
      await action.execute!({ policyID: "P", employeeEmail: "e@d.com", ruleID: 9, tag: "t" }, ctx),
    Error,
    "Rule not found",
  );
});

Deno.test("update-expense-rule: declares an idempotent perform", () => {
  assertEquals([action.type, action.idempotent], ["perform", true]);
});

import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-expense-rule.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

Deno.test("create-expense-rule: posts create/expenseRules with only the given actions", async () => {
  const { ctx, calls } = mockCtx([{ body: { responseCode: 200 } }]);
  const out = await action.execute!({
    policyID: "P",
    employeeEmail: "e@d.com",
    tag: "Tag Name",
    defaultBillable: false,
  }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "create",
    inputSettings: {
      type: "expenseRules",
      policyID: "P",
      employeeEmail: "e@d.com",
      actions: { tag: "Tag Name", defaultBillable: false },
    },
  });
  assertEquals(out, { response: { responseCode: 200 } });
});

Deno.test("create-expense-rule: needs a tag or a billable default, and ids", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ policyID: "P", employeeEmail: "e@d.com" }, ctx),
    Error,
    "at least one",
  );
  await assertRejects(
    async () => await action.execute!({ policyID: "", employeeEmail: "e@d.com", tag: "t" }, ctx),
    Error,
    "policyID is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-expense-rule: surfaces vendor errors", async () => {
  const { ctx } = mockCtx([{ body: { responseMessage: "no such member", responseCode: 410 } }]);
  await assertRejects(
    async () => await action.execute!({ policyID: "P", employeeEmail: "e@d.com", tag: "t" }, ctx),
    Error,
    "no such member",
  );
});

Deno.test("create-expense-rule: declares a non-idempotent perform", () => {
  assertEquals([action.type, action.idempotent], ["perform", false]);
});

import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-report.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const EXP = { date: "2026-01-01", currency: "USD", merchant: "Cafe", amount: 1234 };

Deno.test("create-report: posts create/report with report title+fields and the expenses", async () => {
  const { ctx, calls } = mockCtx([{
    body: { responseCode: 200, reportName: "Trip", reportID: "R006AseGxMka" },
  }]);
  const out = await action.execute!({
    policyID: "0123456789ABCDEF",
    title: "Trip",
    expenses: [EXP],
    employeeEmail: "u@d.com",
    fields: '{"reason_of_trip":"Business trip"}',
  }, ctx);
  assertWire(calls[0]);
  assertEquals(sent(calls[0]).job, {
    type: "create",
    inputSettings: {
      type: "report",
      policyID: "0123456789ABCDEF",
      report: { title: "Trip", fields: { reason_of_trip: "Business trip" } },
      employeeEmail: "u@d.com",
      expenses: [EXP],
    },
  });
  assertEquals(out, { reportID: "R006AseGxMka", reportName: "Trip" });
});

Deno.test("create-report: omits fields and employeeEmail when not given", async () => {
  const { ctx, calls } = mockCtx([{
    body: { responseCode: 200, reportName: "T", reportID: "R1" },
  }]);
  await action.execute!({ policyID: "P", title: "T", expenses: [EXP] }, ctx);
  const s = sent(calls[0]).job.inputSettings;
  assertEquals(s.report, { title: "T" });
  assert(!("employeeEmail" in s));
});

Deno.test("create-report: validates inputs locally (date key is `date`, not `created`)", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ policyID: "", title: "T", expenses: [EXP] }, ctx),
    Error,
    "policyID is required",
  );
  await assertRejects(
    async () =>
      await action.execute!({
        policyID: "P",
        title: "T",
        expenses: [{ ...EXP, date: undefined, created: "2026-01-01" }],
      }, ctx),
    Error,
    "date is required",
  );
  await assertRejects(
    async () =>
      await action.execute!(
        { policyID: "P", title: "T", expenses: [{ ...EXP, amount: "12" }] },
        ctx,
      ),
    Error,
    "integer number of cents",
  );
  await assertRejects(
    async () =>
      await action.execute!({ policyID: "P", title: "T", expenses: [EXP], fields: "{bad" }, ctx),
    Error,
    "valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-report: surfaces the not-enabled authorisation error", async () => {
  const { ctx } = mockCtx([{
    body: {
      responseMessage: "Not authorized to authenticate as user user@domain.com",
      responseCode: 500,
    },
  }]);
  await assertRejects(
    async () => await action.execute!({ policyID: "P", title: "T", expenses: [EXP] }, ctx),
    Error,
    "Not authorized",
  );
});

Deno.test("create-report: declares a non-idempotent perform", () => {
  assertEquals([action.type, action.idempotent], ["perform", false]);
});

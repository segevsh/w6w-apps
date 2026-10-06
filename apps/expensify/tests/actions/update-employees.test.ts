import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-employees.ts";
import { mockCtx } from "../_helpers.ts";
import { assertWire, sent } from "../_job.ts";

const EMP = {
  employeeEmail: "e@d.com",
  managerEmail: "m@d.com",
  policyID: "0123456789ABCDEF",
  employeeID: "12345",
};

Deno.test("update-employees: posts the advanced updater job with the feed in the data field", async () => {
  const body = {
    responseCode: 200,
    "dry-run": false,
    updatedEmployeesCount: 1,
    diff: { diffToAdd: { "0123456789ABCDEF": ["e@d.com"] } },
    securityGroupEmployeesMap: {},
    skippedEmployees: [{ email: "x@d.com", reason: "No policy found" }],
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({
    employees: [EMP],
    dryRun: false,
    setEmployeePrimaryPolicy: "new_employees",
    shouldFixApprovalChains: false,
    fixFirstLevelManagersOnly: true,
    shouldSkipNotificationEmail: true,
    notifyEmails: ["a@d.com", "b@d.com"],
  }, ctx);
  assertWire(calls[0]);
  const { job, extra } = sent(calls[0]);
  assertEquals(job, {
    type: "update",
    "dry-run": false,
    dataSource: "request",
    inputSettings: { type: "employees", entity: "generic" },
    setEmployeePrimaryPolicy: "new_employees",
    shouldFixApprovalChains: false,
    fixFirstLevelManagersOnly: true,
    shouldSkipNotificationEmail: true,
    onFinish: [{ actionName: "email", recipients: "a@d.com,b@d.com" }],
  });
  assertEquals(JSON.parse(extra.data), [EMP]);
  assertEquals(out, {
    dryRun: false,
    updatedEmployeesCount: 1,
    diff: body.diff,
    securityGroupEmployeesMap: {},
    skippedEmployees: body.skippedEmployees,
  });
});

Deno.test("update-employees: defaults to a dry run and never sends the deprecated CSV fileType", async () => {
  const { ctx, calls } = mockCtx([{
    body: { responseCode: 200, "dry-run": true, updatedEmployeesCount: 0 },
  }]);
  const out = await action.execute!({ employees: JSON.stringify([EMP]) }, ctx) as Record<
    string,
    unknown
  >;
  const { job } = sent(calls[0]);
  assertEquals(job["dry-run"], true);
  assert(!("fileType" in job.inputSettings));
  assert(!("onFinish" in job) && !("setEmployeePrimaryPolicy" in job));
  assertEquals(out.dryRun, true);
});

Deno.test("update-employees: every employee needs the four required fields", async () => {
  const { ctx, calls } = mockCtx([]);
  for (const f of ["employeeEmail", "managerEmail", "employeeID", "policyID"]) {
    const bad = { ...EMP, [f]: "" };
    await assertRejects(
      async () => await action.execute!({ employees: [EMP, bad] }, ctx),
      Error,
      `employees[1].${f} is required`,
    );
  }
  await assertRejects(
    async () => await action.execute!({ employees: [] }, ctx),
    Error,
    "non-empty",
  );
  await assertRejects(
    async () =>
      await action.execute!({ employees: [EMP], setEmployeePrimaryPolicy: "some" as never }, ctx),
    Error,
    "setEmployeePrimaryPolicy must be",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-employees: surfaces the vendor error", async () => {
  const { ctx } = mockCtx([{
    body: { responseMessage: "Invalid input data, employee data is missing", responseCode: 410 },
  }]);
  await assertRejects(
    async () => await action.execute!({ employees: [EMP] }, ctx),
    Error,
    "employee data is missing",
  );
});

Deno.test("update-employees: declares an idempotent perform with a dry-run default", () => {
  assertEquals([action.type, action.idempotent], ["perform", true]);
  assertEquals(action.params!.find((p) => p.key === "dryRun")!.default, true);
});

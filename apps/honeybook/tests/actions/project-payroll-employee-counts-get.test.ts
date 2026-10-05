import { assertEquals, assertRejects } from "@std/assert";
import projectPayrollEmployeeCountsGet from "../../actions/project-payroll-employee-counts-get.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "employeeIds": "x-employeeIds" };

Deno.test("project-payroll-employee-counts-get: sends GET /projects/payroll_employee_counts with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await projectPayrollEmployeeCountsGet.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/payroll_employee_counts");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), { "employee_ids": "x-employeeIds" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-payroll-employee-counts-get: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectPayrollEmployeeCountsGet.execute({ "employeeIds": "x-employeeIds" } as never, ctx);
  assertEquals(queryOf(calls[0].url), { "employee_ids": "x-employeeIds" });
});

Deno.test("project-payroll-employee-counts-get: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectPayrollEmployeeCountsGet.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});

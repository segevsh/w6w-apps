import { assertEquals, assertRejects } from "@std/assert";
import projectPayrollEmployeeRemove from "../../actions/project-payroll-employee-remove.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "projectId": "x-projectId", "employeeId": "x-employeeId" };

Deno.test("project-payroll-employee-remove: sends DELETE /projects/{id}/payroll_employees/{employee_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await projectPayrollEmployeeRemove.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/payroll_employees/x-employeeId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

Deno.test("project-payroll-employee-remove: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await projectPayrollEmployeeRemove.execute(
    { "projectId": "x-projectId", "employeeId": "x-employeeId" } as never,
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("project-payroll-employee-remove: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await projectPayrollEmployeeRemove.execute({
    ...INPUT,
    ...{ "projectId": "a/b", "employeeId": "a/b" },
  }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-payroll-employee-remove: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectPayrollEmployeeRemove.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});

import { assertEquals, assertRejects } from "@std/assert";
import projectPayrollEmployeeAdd from "../../actions/project-payroll-employee-add.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "projectId": "x-projectId", "employeeId": "x-employeeId" };

Deno.test("project-payroll-employee-add: sends PUT /projects/{id}/payroll_employees/{employee_id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await projectPayrollEmployeeAdd.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/payroll_employees/x-employeeId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-payroll-employee-add: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectPayrollEmployeeAdd.execute(
    { "projectId": "x-projectId", "employeeId": "x-employeeId" } as never,
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("project-payroll-employee-add: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectPayrollEmployeeAdd.execute({
    ...INPUT,
    ...{ "projectId": "a/b", "employeeId": "a/b" },
  }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-payroll-employee-add: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectPayrollEmployeeAdd.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});

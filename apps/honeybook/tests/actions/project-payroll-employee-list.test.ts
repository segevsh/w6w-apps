import { assertEquals, assertRejects } from "@std/assert";
import projectPayrollEmployeeList from "../../actions/project-payroll-employee-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "projectId": "x-projectId" };

Deno.test("project-payroll-employee-list: sends GET /projects/{id}/payroll_employees with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await projectPayrollEmployeeList.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/x-projectId/payroll_employees");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("project-payroll-employee-list: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectPayrollEmployeeList.execute({ "projectId": "x-projectId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("project-payroll-employee-list: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await projectPayrollEmployeeList.execute({ ...INPUT, ...{ "projectId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("project-payroll-employee-list: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await projectPayrollEmployeeList.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});

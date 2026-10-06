import { assertEquals } from "@std/assert";
import action from "../../actions/employee-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("employee-list: GET /employees maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({ employeeIds: ["e1"], limit: 10, cursor: "c1" }, ctx) as {
    employees: unknown[];
    cursor?: string;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/employees");
  assertEquals(queryOf(calls[0].url), { employee_ids: "e1", limit: "10", cursor: "c1" });
  assertEquals(out.employees.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("employee-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { employees: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});

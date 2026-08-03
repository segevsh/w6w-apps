import { assert, assertEquals } from "@std/assert";
import getEmployeeTableData from "../../actions/get-employee-table-data.ts";
import { mockCtx, param } from "../_helpers.ts";

Deno.test("get-employee-table-data: reads /employees/{id}/tables/{table}", async () => {
  assertEquals(getEmployeeTableData.type, "read");
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getEmployeeTableData.execute({ id: "42", table: "jobInfo" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/42/tables/jobInfo");
  assertEquals(calls[0].method, "GET");
});

Deno.test("get-employee-table-data: the documented `all` sentinel passes through", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getEmployeeTableData.execute({ id: "all", table: "compensation" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/all/tables/compensation");
});

Deno.test("get-employee-table-data: a custom table name is accepted, not rejected", async () => {
  // `table` is free text precisely because `custom1` / `custom42` are valid; a
  // closed `select` of standard names would forbid them.
  assertEquals(param(getEmployeeTableData, "table").options, undefined);
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getEmployeeTableData.execute({ id: "1", table: "custom42" }, ctx);
  assert(new URL(calls[0].url).pathname.endsWith("/tables/custom42"));
});

Deno.test("get-employee-table-data: both path segments are escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await getEmployeeTableData.execute({ id: "a/b", table: "c d" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/employees/a%2Fb/tables/c%20d");
});

Deno.test("get-employee-table-data: both params are required", () => {
  const required = (getEmployeeTableData.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["id", "table"]);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import employeeList from "../../actions/employee-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

test("employee-list: calls GET /employees", async () => {
  const { ctx, calls } = mockCtx([{ body: page("employees", [{ id: "e1" }]) }]);
  const out = await employeeList.execute({ page: 1, pageSize: 50 }, ctx);

  assertEquals(pathOf(calls[0].url), "/employees");
  assertEquals(queryOf(calls[0].url), { page: "1", page_size: "50" });
  assertEquals(out.items, [{ id: "e1" }]);
});

test("employee-list: says out loud that only active employees come back", () => {
  assertEquals(employeeList.description?.includes("Deactivated employees are not"), true);
});

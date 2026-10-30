import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import departmentGet from "../../actions/department-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const DEPARTMENT = { id: "dp_1", name: "Engineering", description: "Product engineering" };

test("department-get: GETs one department by id", async () => {
  const { ctx, calls } = mockCtx([{ body: DEPARTMENT }]);
  const result = await departmentGet.execute({ id: "dp_1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/departments/dp_1");
  assertEquals(result, DEPARTMENT);
});

test("department-get: the id is required and escaped", async () => {
  assertEquals(departmentGet.params?.find((p) => p.key === "id")?.required, true);

  const { ctx, calls } = mockCtx([{ body: DEPARTMENT }]);
  await departmentGet.execute({ id: "dp 1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/departments/dp%201");
});

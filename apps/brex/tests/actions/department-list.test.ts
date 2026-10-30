import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import departmentList from "../../actions/department-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

const DEPARTMENT = { id: "dp_1", name: "Engineering", description: "Product engineering" };

test("department-list: GETs the collection and forwards name, limit and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: page([DEPARTMENT]) }]);
  await departmentList.execute({ name: "Eng", limit: 5, cursor: "c1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/departments");
  assertEquals(queryOf(calls[0].url), { name: "Eng", limit: "5", cursor: "c1" });
});

test("department-list: the page is normalized", async () => {
  const { ctx } = mockCtx([{ body: page([DEPARTMENT]) }]);
  const result = await departmentList.execute({}, ctx);

  assertEquals(result, { items: [DEPARTMENT], next_cursor: null, count: 1 });
});

test("department-list: it is a search", () => {
  assertEquals(departmentList.type, "search");
  assertEquals(departmentList.resource, "department");
});

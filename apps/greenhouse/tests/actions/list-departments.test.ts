import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import listDepartments from "../../actions/list-departments.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("list-departments: calls GET /v3/departments", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1, parent_id: null }])]);
  await listDepartments.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/departments");
});

test("list-departments: maps the parent and external-id filters", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listDepartments.execute({ parentId: 4, externalId: "DEP-1" }, ctx);
  assertEquals(queryOf(calls[0].url), { parent_id: "4", external_id: "DEP-1" });
});

/**
 * Departments nest, so a `parent_id` filter returns direct children only and a
 * full tree needs the unfiltered list — worth saying where someone will read it.
 */
test("list-departments: the parent hint explains that the list is a tree", () => {
  const param = (listDepartments.params ?? []).find((p) => p.key === "parentId");
  assert(param?.hint?.includes("tree"), param?.hint);
});

test("list-departments: a cursor rejects the parent filter it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listDepartments.execute({ cursor: "N", parentId: 4 }, ctx),
    Error,
  );
  assert(err.message.includes("parent_id"), err.message);
});

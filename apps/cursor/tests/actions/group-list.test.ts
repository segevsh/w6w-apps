import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import groupList from "../../actions/group-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("group-list: calls GET /teams/groups with billingCycle", async () => {
  const { ctx, calls } = mockCtx([
    { body: { groups: [], unassignedGroup: {}, billingCycle: {} } },
  ]);
  await groupList.execute({ billingCycle: "2025-01-15" }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/groups");
  assertEquals(queryOf(calls[0].url), { billingCycle: "2025-01-15" });
});

test("group-list: billingCycle is optional", async () => {
  const { ctx, calls } = mockCtx([{ body: { groups: [], unassignedGroup: {}, billingCycle: {} } }]);
  await groupList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

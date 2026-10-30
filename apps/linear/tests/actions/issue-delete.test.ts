import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-delete.ts";

test("issue-delete: sends the IssueDelete mutation", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { issueDelete: { success: true } } } }]);
  await action.execute({ issueId: "i1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { id: "i1" });
});

test("issue-delete: describes it as a trash move, not an erasure", () => {
  assert(action.description?.includes("trash"));
});

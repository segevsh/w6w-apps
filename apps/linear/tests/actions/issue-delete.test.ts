import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-delete.ts";

Deno.test("issue-delete: sends the IssueDelete mutation", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { issueDelete: { success: true } } } }]);
  await action.execute({ issueId: "i1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, { id: "i1" });
});

Deno.test("issue-delete: describes it as a trash move, not an erasure", () => {
  assert(action.description?.includes("trash"));
});

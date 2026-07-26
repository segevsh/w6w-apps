import { assert, assertEquals } from "@std/assert";
import { mockJiraCtx } from "../_helpers.ts";
import action from "../../actions/issue-delete.ts";

Deno.test("issue-delete: DELETEs the issue", async () => {
  const { ctx, calls } = mockJiraCtx([{ status: 204 }]);
  await action.execute({ issueKey: "ENG-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/rest/api/3/issue/ENG-1");
});

Deno.test("issue-delete: passes deleteSubtasks through", async () => {
  const { ctx, calls } = mockJiraCtx([{ status: 204 }]);
  await action.execute({ issueKey: "ENG-1", deleteSubtasks: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("deleteSubtasks"), "true");
});

Deno.test("issue-delete: warns that Jira has no trash", () => {
  assert(action.description?.includes("no trash"));
});

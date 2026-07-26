import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-create.ts";

const OK = { data: { issueCreate: { success: true, issue: { id: "i1", identifier: "ENG-1" } } } };

Deno.test("issue-create: sends the IssueCreate mutation with an input object", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ teamId: "t1", title: "Fix login" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query.includes("mutation IssueCreate"), true);
  assertEquals(sent.variables.input, { teamId: "t1", title: "Fix login" });
});

Deno.test("issue-create: splits comma-separated label ids into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ teamId: "t1", title: "x", labelIds: "l1, l2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input.labelIds, ["l1", "l2"]);
});

Deno.test("issue-create: keeps priority 0 (No priority) rather than dropping it", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ teamId: "t1", title: "x", priority: 0 }, ctx);
  // 0 is a meaningful priority in Linear, not an absent value.
  assertEquals(JSON.parse(calls[0].body!).variables.input.priority, 0);
});

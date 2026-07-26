import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-get-many.ts";

const OK = { data: { issues: { nodes: [], pageInfo: { hasNextPage: false } } } };

Deno.test("issue-get-many: builds Linear's nested filter shape", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ teamId: "t1", assigneeId: "u1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, {
    team: { id: { eq: "t1" } },
    assignee: { id: { eq: "u1" } },
  });
});

Deno.test("issue-get-many: omits the filter entirely when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({}, ctx);
  const vars = JSON.parse(calls[0].body!).variables;
  assertEquals("filter" in vars, false);
  assertEquals(vars.first, 50);
});

Deno.test("issue-get-many: passes the cursor through for the next page", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ after: "cursor-1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.after, "cursor-1");
});

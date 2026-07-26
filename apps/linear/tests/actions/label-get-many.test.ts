import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/label-get-many.ts";

Deno.test("label-get-many: filters by team when given one", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { issueLabels: { nodes: [] } } } }]);
  await action.execute({ teamId: "t1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, { team: { id: { eq: "t1" } } });
});

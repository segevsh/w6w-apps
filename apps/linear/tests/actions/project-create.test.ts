import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-create.ts";

test("project-create: splits the team ids into an array", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { projectCreate: { success: true } } } }]);
  await action.execute({ name: "Q3", teamIds: "t1,t2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.input, {
    name: "Q3",
    teamIds: ["t1", "t2"],
  });
});

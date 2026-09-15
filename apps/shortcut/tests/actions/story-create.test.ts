import { assertEquals } from "@std/assert";
import storyCreate from "../../actions/story-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("story-create: posts only name when nothing else is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await storyCreate.execute({ name: "Fix the checkout bug" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v3/stories");
  assertEquals(JSON.parse(calls[0].body!), { name: "Fix the checkout bug" });
});

Deno.test("story-create: maps camelCase inputs to Shortcut's snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await storyCreate.execute(
    {
      name: "Fix the checkout bug",
      storyType: "bug",
      workflowStateId: 500,
      epicId: 9,
      groupId: "11111111-1111-1111-1111-111111111111",
      ownerIds: ["u1", "u2"],
    },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    name: "Fix the checkout bug",
    story_type: "bug",
    workflow_state_id: 500,
    epic_id: 9,
    group_id: "11111111-1111-1111-1111-111111111111",
    owner_ids: ["u1", "u2"],
  });
});

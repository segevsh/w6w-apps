import { assertEquals } from "@std/assert";
import storyUpdate from "../../actions/story-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("story-update: moving a Story is just setting workflowStateId", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 123 } }]);
  await storyUpdate.execute({ storyId: 123, workflowStateId: 501 }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v3/stories/123");
  assertEquals(JSON.parse(calls[0].body!), { workflow_state_id: 501 });
});

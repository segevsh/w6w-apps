import { assertEquals } from "@std/assert";
import storySearch from "../../actions/story-search.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("story-search: POSTs the filter body and returns the bare array unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: [{ id: 1 }, { id: 2 }] }]);
  const out = await storySearch.execute(
    { epicId: 9, workflowStateTypes: ["started", "done"] },
    ctx,
  ) as unknown[];

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/stories/search");
  assertEquals(JSON.parse(calls[0].body!), {
    epic_id: 9,
    workflow_state_types: ["started", "done"],
  });
  assertEquals(out.length, 2);
});

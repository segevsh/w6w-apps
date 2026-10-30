import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import storyDelete from "../../actions/story-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("story-delete: DELETEs and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await storyDelete.execute({ storyId: 123 }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/stories/123");
  assertEquals(out, { status: 204 });
});

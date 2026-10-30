import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import activityDelete from "../../actions/activity-delete.ts";
import { mockCtx, NO_CONTENT_204 } from "../_helpers.ts";

test("activity-delete: DELETEs /activities/:id", async () => {
  const { ctx, calls } = mockCtx([NO_CONTENT_204]);
  const out = await activityDelete.execute({ activityId: 263 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/activities/263");
  assertEquals(out, { deleted: true });
});

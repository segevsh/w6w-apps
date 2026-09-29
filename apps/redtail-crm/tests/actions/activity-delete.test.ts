import { assertEquals } from "@std/assert";
import activityDelete from "../../actions/activity-delete.ts";
import { mockCtx, NO_CONTENT_204 } from "../_helpers.ts";

Deno.test("activity-delete: DELETEs /activities/:id", async () => {
  const { ctx, calls } = mockCtx([NO_CONTENT_204]);
  const out = await activityDelete.execute({ activityId: 263 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/activities/263");
  assertEquals(out, { deleted: true });
});

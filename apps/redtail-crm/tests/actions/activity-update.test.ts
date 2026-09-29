import { assertEquals } from "@std/assert";
import activityUpdate from "../../actions/activity-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("activity-update: PUTs /activities/:id, e.g. to mark it complete", async () => {
  const { ctx, calls } = mockCtx([{ body: { activity: { id: 263, percentdone: 100 } } }]);
  const out = await activityUpdate.execute(
    { activityId: 263, percentdone: 100, completed: true },
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/activities/263");
  assertEquals(JSON.parse(calls[0].body!), { percentdone: 100, completed: true });
  assertEquals(out.activity.percentdone, 100);
});

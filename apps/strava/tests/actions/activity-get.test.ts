import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-get.ts";

Deno.test("activity-get: GETs the activity by id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 42, name: "Morning Run" } }]);
  assertEquals(await action.execute({ activityId: "42" }, ctx), { id: 42, name: "Morning Run" });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v3/activities/42");
});

Deno.test("activity-get: passes include_all_efforts", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ activityId: "42", includeAllEfforts: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("include_all_efforts"), "true");
});

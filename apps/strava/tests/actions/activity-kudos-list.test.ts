import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-kudos-list.ts";

Deno.test("activity-kudos-list: GETs kudoers for the activity", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ firstname: "Marianne" }] }]);
  const out = await action.execute({ activityId: "42" }, ctx);
  assertEquals(out, [{ firstname: "Marianne" }]);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v3/activities/42/kudos");
});

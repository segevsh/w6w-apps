import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-activity-status.ts";

Deno.test("get-activity-status: GETs /v3/activities/{activity_id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { activity_id: "a1", state: "completed", percent_done: 100, activity_errors: [] },
  }]);
  const out = await action.execute!({ activityId: "a1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/activities/a1");
  assertEquals(out.state, "completed");
  assertEquals(out.percent_done, 100);
});

Deno.test("get-activity-status: surfaces per-row errors on a completed activity", async () => {
  const { ctx } = mockCtx([{
    body: {
      activity_id: "a1",
      state: "completed",
      activity_errors: ["row 3: invalid email"],
      status: { items_total_count: 10, error_count: 1 },
    },
  }]);
  const out = await action.execute!({ activityId: "a1" }, ctx) as Record<string, unknown>;
  assertEquals(out.activity_errors, ["row 3: invalid email"]);
});

Deno.test("get-activity-status: url-encodes the activity id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ activityId: "a/1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/activities/a%2F1");
});

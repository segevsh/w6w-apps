import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-comments-list.ts";

Deno.test("activity-comments-list: GETs comments for the activity", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, text: "Nice pace!" }] }]);
  const out = await action.execute({ activityId: "42", page: 1, perPage: 20 }, ctx);
  assertEquals(out, [{ id: 1, text: "Nice pace!" }]);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v3/activities/42/comments");
  assertEquals(url.searchParams.get("per_page"), "20");
});

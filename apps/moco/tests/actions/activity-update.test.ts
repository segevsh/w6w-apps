import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/activity-update.ts";

test("activity-update: PATCHes /activities/:id with only provided fields", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 3, hours: 1 } }]);
  await action.execute({ activityId: 3, hours: 1, stopTimer: true }, ctx);
  assertEquals(calls[0].url, "https://acme.mocoapp.com/api/v1/activities/3");
  assertEquals(calls[0].method, "PATCH");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { seconds: 3600, stop_timer: true });
});

test("activity-update: omits seconds entirely when hours is not provided", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: { id: 3 } }]);
  await action.execute({ activityId: 3, description: "updated" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("seconds" in body, false);
  assertEquals(body.description, "updated");
});

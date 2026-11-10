import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-activity.ts";
import { mockCtx } from "../_helpers.ts";

test("new-activity: seeds, emits unseen activities, retries idempotently, and calls the activity list", async () => {
  const seed = await trigger.poll!(
    { params: {}, state: {}, subscriptionId: "sub" },
    mockCtx([{ body: [{ _id: "old" }] }]).ctx,
  );
  assertEquals(seed.events, []);
  assertEquals(seed.nextState?.seeded, true);
  const activities = [{ _id: "new", type: "emailsReplied" }, { _id: "old" }];
  const freshMock = mockCtx([{ body: activities }]);
  const fresh = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    freshMock.ctx,
  );
  assertEquals(fresh.events, [activities[0]]);
  const retryA = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([{ body: activities }]).ctx,
  );
  const retryB = await trigger.poll!(
    { params: {}, state: seed.nextState!, subscriptionId: "sub" },
    mockCtx([{ body: activities }]).ctx,
  );
  assertEquals(retryA, retryB);
  const request = new URL(freshMock.calls[0].url);
  assertEquals([freshMock.calls[0].method, request.pathname, request.search], [
    "GET",
    "/api/activities",
    "?offset=0&limit=100&version=v2",
  ]);
});

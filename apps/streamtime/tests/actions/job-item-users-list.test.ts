import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobItemUsersList from "../../actions/job-item-users-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("job-item-users-list: reads the schedule entries on an item", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 7, userId: 42, totalPlannedMinutes: 240 }] }]);
  const result = await jobItemUsersList.execute({ jobItemId: 88 }, ctx) as {
    jobItemUsers: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/job_items/88/job_item_users");
  assertEquals(result.jobItemUsers.length, 1);
});

/** A zero here is ambiguous, and the description has to say so. */
test("job-item-users-list: the description warns about pooled planned time", () => {
  assertEquals(/pools its time at item level/.test(jobItemUsersList.description ?? ""), true);
});

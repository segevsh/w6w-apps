import { assertEquals } from "@std/assert";
import jobItemUserUpdate from "../../actions/job-item-user-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-user-update: PUTs the changed plan", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7 } }]);
  await jobItemUserUpdate.execute({ jobItemUserId: 7, jobCurrencySellRate: 120 }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/job_item_users/7");
  assertEquals(bodyOf(calls[0]), { jobCurrencySellRate: 120 });
});

Deno.test("job-item-user-update: logged and completed figures are read-only", () => {
  const keys = (jobItemUserUpdate.params ?? []).map((p) => p.key);
  for (
    const readonly of ["totalLoggedMinutes", "completedDate", "earliestStartDate", "jobItemId"]
  ) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});

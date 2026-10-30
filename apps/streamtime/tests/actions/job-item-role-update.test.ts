import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobItemRoleUpdate from "../../actions/job-item-role-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("job-item-role-update: PUTs the new plan", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5 } }]);
  await jobItemRoleUpdate.execute({ jobItemRoleId: 5, totalPlannedMinutes: 300 }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/job_item_roles/5");
  assertEquals(bodyOf(calls[0]), { totalPlannedMinutes: 300 });
});

test("job-item-role-update: the computed totals and `active` are read-only", () => {
  const keys = (jobItemRoleUpdate.params ?? []).map((p) => p.key);
  for (const readonly of ["active", "jobCurrencyTotalPlannedTimeExTax", "jobItemId"]) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});

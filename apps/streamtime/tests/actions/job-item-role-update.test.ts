import { assertEquals } from "@std/assert";
import jobItemRoleUpdate from "../../actions/job-item-role-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-role-update: PUTs the new plan", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 5 } }]);
  await jobItemRoleUpdate.execute({ jobItemRoleId: 5, totalPlannedMinutes: 300 }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/job_item_roles/5");
  assertEquals(bodyOf(calls[0]), { totalPlannedMinutes: 300 });
});

Deno.test("job-item-role-update: the computed totals and `active` are read-only", () => {
  const keys = (jobItemRoleUpdate.params ?? []).map((p) => p.key);
  for (const readonly of ["active", "jobCurrencyTotalPlannedTimeExTax", "jobItemId"]) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});

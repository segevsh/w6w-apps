import { assertEquals } from "@std/assert";
import jobItemUserCreate from "../../actions/job-item-user-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-user-create: schedules the user on the item", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, userId: 42 } }]);
  await jobItemUserCreate.execute({ jobItemId: 88, userId: 42, totalPlannedMinutes: 240 }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/job_items/88/job_item_users");
  assertEquals(bodyOf(calls[0]), { userId: 42, totalPlannedMinutes: 240 });
});

Deno.test("job-item-user-create: the planned-minutes caveat is in the hint", () => {
  const param = (jobItemUserCreate.params ?? []).find((p) => p.key === "totalPlannedMinutes");
  assertEquals(/allocates time by person/.test(param?.hint ?? ""), true);
  assertEquals(param?.validation, { integer: true, min: 0 });
});

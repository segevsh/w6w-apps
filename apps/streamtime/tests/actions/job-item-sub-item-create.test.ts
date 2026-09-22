import { assertEquals } from "@std/assert";
import jobItemSubItemCreate from "../../actions/job-item-sub-item-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-sub-item-create: POSTs the checklist line", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 6, description: "Prepare wireframes" } }]);
  await jobItemSubItemCreate.execute({ jobItemId: 88, description: "Prepare wireframes" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/job_items/88/job_item_sub_items");
  assertEquals(bodyOf(calls[0]), { description: "Prepare wireframes" });
});

/** Completion stamps are read-only, so a new sub-item cannot arrive completed. */
Deno.test("job-item-sub-item-create: completion cannot be set through this route", () => {
  const keys = (jobItemSubItemCreate.params ?? []).map((p) => p.key);
  assertEquals(keys.includes("completedDatetime"), false);
  assertEquals(keys.includes("completedByUserId"), false);
});

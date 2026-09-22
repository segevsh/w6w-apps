import { assertEquals } from "@std/assert";
import jobItemSubItemsList from "../../actions/job-item-sub-items-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-sub-items-list: reads the nested route", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 6, description: "Prepare wireframes" }] }]);
  const result = await jobItemSubItemsList.execute({ jobItemId: 88 }, ctx) as {
    jobItemSubItems: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/v2/job_items/88/job_item_sub_items");
  assertEquals(result.jobItemSubItems.length, 1);
});

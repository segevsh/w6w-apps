import { assertEquals } from "@std/assert";
import jobItemSubItemGet from "../../actions/job-item-sub-item-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-sub-item-get: reads GET /v2/job_item_sub_items/{id}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { id: 6, description: "Prepare wireframes", completedDatetime: "2025-03-18T00:00:00Z" },
    },
  ]);
  const result = await jobItemSubItemGet.execute({ jobItemSubItemId: 6 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2/job_item_sub_items/6");
  assertEquals(result.description, "Prepare wireframes");
});

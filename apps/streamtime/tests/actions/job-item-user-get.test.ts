import { assertEquals } from "@std/assert";
import jobItemUserGet from "../../actions/job-item-user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-user-get: reads GET /v2/job_item_users/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, userId: 42, totalLoggedMinutes: 60 } }]);
  const result = await jobItemUserGet.execute({ jobItemUserId: 7 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/job_item_users/7");
  assertEquals(result.totalLoggedMinutes, 60);
});

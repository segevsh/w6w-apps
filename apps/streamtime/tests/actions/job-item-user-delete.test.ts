import { assertEquals } from "@std/assert";
import jobItemUserDelete from "../../actions/job-item-user-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-item-user-delete: DELETEs the schedule entry and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await jobItemUserDelete.execute({ jobItemUserId: 7 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/job_item_users/7");
  assertEquals(result.deleted, true);
  assertEquals(result.status, 200);
});

Deno.test("job-item-user-delete: unscheduling twice is the same end state", () => {
  assertEquals(jobItemUserDelete.idempotent, true);
});

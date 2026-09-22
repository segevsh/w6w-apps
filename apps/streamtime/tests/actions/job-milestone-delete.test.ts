import { assertEquals } from "@std/assert";
import jobMilestoneDelete from "../../actions/job-milestone-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * The document describes the 200 with a copy-pasted sentence ("Job milestone
 * fetched.") and declares no body, so the action reports the status code rather
 * than inventing a payload.
 */
Deno.test("job-milestone-delete: DELETEs and reports the status, not a made-up body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await jobMilestoneDelete.execute({ jobMilestoneId: 11 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/job_milestones/11");
  assertEquals(result, { deleted: true, status: 200 });
});

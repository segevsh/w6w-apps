import { assertEquals } from "@std/assert";
import jobActivityEntryCreate from "../../actions/job-activity-entry-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-activity-entry-create: POSTs the documented `{ message }` body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, activityEntryType: { name: "Comment" } } }]);
  await jobActivityEntryCreate.execute({ jobId: 1010, message: "Kick-off done" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/activity_entries");
  assertEquals(bodyOf(calls[0]), { message: "Kick-off done" });
});

Deno.test("job-activity-entry-create: the message is required", () => {
  const param = (jobActivityEntryCreate.params ?? []).find((p) => p.key === "message");
  assertEquals(param?.required, true);
  assertEquals(param?.type, "text");
});

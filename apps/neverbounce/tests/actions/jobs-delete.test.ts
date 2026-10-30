import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobsDelete from "../../actions/jobs-delete.ts";
import { mockCtx } from "../_helpers.ts";

test("jobs-delete: posts job_id and returns the success envelope", async () => {
  const body = { status: "success", execution_time: 57 };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await jobsDelete.execute({ jobId: 123 }, ctx);

  assertEquals(calls[0].method, "POST");
  const sentBody = JSON.parse(calls[0].body!);
  assertEquals(sentBody, { job_id: 123 });
  assertEquals(result, body);
});

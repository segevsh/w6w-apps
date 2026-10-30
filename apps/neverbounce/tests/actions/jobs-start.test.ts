import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobsStart from "../../actions/jobs-start.ts";
import { mockCtx } from "../_helpers.ts";

test("jobs-start: posts job_id and run_sample, returns queue_id", async () => {
  const body = { status: "success", queue_id: "NB-PQ-59246392E9E5D", execution_time: 712 };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await jobsStart.execute({ jobId: 296050, runSample: true }, ctx);

  assertEquals(calls[0].method, "POST");
  const sentBody = JSON.parse(calls[0].body!);
  assertEquals(sentBody, { job_id: 296050, run_sample: true });
  assertEquals(result, body);
});

import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobStatusGet from "../../actions/job-status-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("job-status-get: reads status/result/error out of the data envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ status: "succeeded", result: { rows: 3 } }),
  }]);
  const out = await jobStatusGet.execute({ jobId: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/jobs/j1");
  assertEquals(out, { status: "succeeded", result: { rows: 3 } });
});

test("job-status-get: a failed job carries an error message", async () => {
  const { ctx } = mockCtx([{
    body: envelope({ status: "failed", error: { message: "bad schema" } }),
  }]);
  const out = await jobStatusGet.execute({ jobId: "j1" }, ctx);
  assertEquals(out.status, "failed");
  assertEquals(out.error?.message, "bad schema");
});

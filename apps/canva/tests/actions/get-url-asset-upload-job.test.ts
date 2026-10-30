import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-url-asset-upload-job.ts";

test("get-url-asset-upload-job: GETs /rest/v1/url-asset-uploads/{jobId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { job: { id: "job1", status: "failed" } } }]);
  const result = await action.execute({ jobId: "job1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/url-asset-uploads/job1");
  assertEquals(result, { id: "job1", status: "failed" });
});

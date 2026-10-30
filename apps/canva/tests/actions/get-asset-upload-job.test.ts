import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-asset-upload-job.ts";

test("get-asset-upload-job: GETs /rest/v1/asset-uploads/{jobId} and unwraps job", async () => {
  const { ctx, calls } = mockCtx([{
    body: { job: { id: "job1", status: "success", asset: { id: "A1" } } },
  }]);
  const result = await action.execute({ jobId: "job1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/asset-uploads/job1");
  assertEquals(result, { id: "job1", status: "success", asset: { id: "A1" } });
});

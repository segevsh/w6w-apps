import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import jobGet from "../../actions/job-get.ts";
import { envelope, mockCtx, obj, pathOf } from "../_helpers.ts";

test("job-get: GETs /jobs/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ jobId: "j1", status: "queued" }) }]);
  const out = await obj(await jobGet.execute({ jobId: "j1" }, ctx));
  assertEquals(pathOf(calls[0].url), "/v1/jobs/j1");
  assertEquals(out.status, "queued");
  await assertRejects(
    async () => await jobGet.execute({ jobId: "" }, ctx),
    Error,
    "Job ID is required",
  );
});

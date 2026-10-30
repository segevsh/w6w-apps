import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobStatusUpdate from "../../actions/job-status-update.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("job-status-update: the new status travels in the QUERY string", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const result = await jobStatusUpdate.execute({ jobId: 1010, jobStatusId: 3 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/job_status");
  assertEquals(queryOf(calls[0].url), { job_status_id: "3" });
  // The route takes no request body at all.
  assertEquals(bodyOf(calls[0]), {});
  assertEquals(result.status, 200);
  assertEquals(result.result, { ok: true });
});

test("job-status-update: one request, not two", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobStatusUpdate.execute({ jobId: 1, jobStatusId: 2 }, ctx);
  assertEquals(calls.length, 1);
});

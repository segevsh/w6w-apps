import { assertEquals, assertRejects } from "@std/assert";
import del from "../../actions/async-job-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("async-job-delete: deletes by id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await del.execute({ jobId: "job-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v3/universal-ai/async/job-1");
  assertEquals(out, { jobId: "job-1", deleted: true });
});

Deno.test("async-job-delete: someone else's or a missing job is an error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { detail: "Job not found" } }]);
  await assertRejects(
    async () => await del.execute({ jobId: "nope" }, ctx),
    Error,
    "Job not found",
  );
});

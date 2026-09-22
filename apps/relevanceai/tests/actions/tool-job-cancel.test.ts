import { assert, assertEquals } from "@std/assert";
import toolJobCancel from "../../actions/tool-job-cancel.ts";
import { bodyOf, mockRelevanceCtx, pathOf } from "../_helpers.ts";

/**
 * The path segment is the JOB id — `/studios/{job_id}/cancel` in the vendor's own
 * schema, not `/studios/{studio_id}/cancel`. Both ids match the same
 * `^[a-zd._-]+$` pattern, so a tool id sent here would look valid and cancel
 * nothing.
 */
Deno.test("tool-job-cancel: POSTs the JOB id to /studios/{job_id}/cancel", async () => {
  const { ctx, calls } = mockRelevanceCtx([{ status: 200 }]);
  const out = await toolJobCancel.execute({ jobId: "j1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/latest/studios/j1/cancel");
  assertEquals(calls[0].method, "POST");
  assertEquals(bodyOf(calls[0]), {});
  assertEquals(out, { cancelled: true });
});

Deno.test("tool-job-cancel: is idempotent and takes only the job id", () => {
  assertEquals(toolJobCancel.type, "perform");
  assertEquals(toolJobCancel.idempotent, true);
  assertEquals(toolJobCancel.params?.map((p) => p.key), ["jobId"]);
  assert(toolJobCancel.params?.[0].hint?.includes("Trigger Tool (Async)"));
});

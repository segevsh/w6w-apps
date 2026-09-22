import { assertEquals } from "@std/assert";
import jobDuplicate from "../../actions/job-duplicate.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-duplicate: POSTs to the duplicate route and returns the new job", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1011, name: "Website Redesign (copy)" } }]);
  const result = await jobDuplicate.execute({ jobId: 1010 }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010/duplicate");
  assertEquals(result.id, 1011);
});

/**
 * The document declares the body as an open object with no named fields, so an
 * empty body is the honest default — nothing is invented on the wire.
 */
Deno.test("job-duplicate: no options means an empty object, not a guessed one", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobDuplicate.execute({ jobId: 1010 }, ctx);
  assertEquals(bodyOf(calls[0]), {});
});

Deno.test("job-duplicate: options are forwarded verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await jobDuplicate.execute({ jobId: 1010, options: '{"copyJobItems":true}' }, ctx);
  assertEquals(bodyOf(calls[0]), { copyJobItems: true });
});

/**
 * Each call creates a new job, so a retry duplicates work — the action must not
 * claim otherwise.
 */
Deno.test("job-duplicate: it is not idempotent", () => {
  assertEquals(jobDuplicate.idempotent, false);
});

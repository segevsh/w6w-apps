import { assertEquals } from "@std/assert";
import submissionDelete from "../../actions/submission-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("submission-delete: DELETEs the submission and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await submissionDelete.execute({ formId: "aB1", submissionId: "s1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/api/forms/aB1/submissions/s1");
  assertEquals(calls[0].body, null, "a DELETE must not carry a body");
  assertEquals(out, { formId: "aB1", submissionId: "s1", status: 200 });
});

/**
 * Fillout documents a `200` with **no response schema** for this endpoint, so
 * there is nothing to parse. Using `status()` rather than `json()` is what
 * keeps an empty body from becoming a parse error.
 */
Deno.test("submission-delete: an empty body is not a failure", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  const out = await submissionDelete.execute({ formId: "aB1", submissionId: "s1" }, ctx);
  assertEquals(out.status, 200);
});

Deno.test("submission-delete: is idempotent — the same end state after a retry", () => {
  assertEquals(submissionDelete.idempotent, true);
});

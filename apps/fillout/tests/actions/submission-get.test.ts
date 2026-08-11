import { assertEquals } from "@std/assert";
import submissionGet from "../../actions/submission-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("submission-get: calls GET /v1/api/forms/{id}/submissions/{sid}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { submission: { submissionId: "s1", submissionTime: "2026-08-01T10:00:00.000Z" } },
  }]);
  const out = await submissionGet.execute({ formId: "aB1", submissionId: "s1" }, ctx) as {
    submission: { submissionId: string };
  };

  assertEquals(pathOf(calls[0].url), "/v1/api/forms/aB1/submissions/s1");
  // The vendor wraps this one in `{submission: …}` where the list endpoint uses
  // `{responses: […]}`. Returning the body unchanged is what keeps the two
  // shapes honest instead of inventing a third.
  assertEquals(out.submission.submissionId, "s1");
});

Deno.test("submission-get: includeEditLink is only sent when true", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  await submissionGet.execute({ formId: "aB1", submissionId: "s1" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
  await submissionGet.execute(
    { formId: "aB1", submissionId: "s1", includeEditLink: true },
    ctx,
  );
  assertEquals(queryOf(calls[1].url), { includeEditLink: "true" });
});

Deno.test("submission-get: both ids are path-escaped independently", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await submissionGet.execute({ formId: "a/b", submissionId: "c?d" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/api/forms/a%2Fb/submissions/c%3Fd");
});

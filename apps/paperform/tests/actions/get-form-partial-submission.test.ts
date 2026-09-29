import { assertEquals } from "@std/assert";
import getFormPartialSubmission from "../../actions/get-form-partial-submission.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-form-partial-submission: reads the HYPHENATED 'partial-submission' results key", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ "partial-submission": { id: "ps1" } }),
  }]);
  const out = await getFormPartialSubmission.execute({ slugOrId: "f1", id: "ps1" }, ctx) as {
    partialSubmission?: { id?: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/partial-submissions/ps1");
  assertEquals(out.partialSubmission?.id, "ps1");
});

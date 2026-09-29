import { assertEquals } from "@std/assert";
import getFormSubmission from "../../actions/get-form-submission.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-form-submission: GETs /v1/forms/{slugOrId}/submissions/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: envelope({ submission: { id: "s1", data: { name: "Ada" } } }),
  }]);
  const out = await getFormSubmission.execute({ slugOrId: "f1", id: "s1" }, ctx) as {
    submission?: { id?: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/submissions/s1");
  assertEquals(out.submission?.id, "s1");
});

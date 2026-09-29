import { assertEquals } from "@std/assert";
import deleteFormPartialSubmission from "../../actions/delete-form-partial-submission.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-form-partial-submission: DELETEs /v1/forms/{slugOrId}/partial-submissions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const out = await deleteFormPartialSubmission.execute({ slugOrId: "f1", id: "ps1" }, ctx) as {
    deleted: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/partial-submissions/ps1");
  assertEquals(out.deleted, true);
});

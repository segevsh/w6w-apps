import { assertEquals } from "@std/assert";
import deleteFormSubmission from "../../actions/delete-form-submission.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-form-submission: DELETEs /v1/forms/{slugOrId}/submissions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const out = await deleteFormSubmission.execute({ slugOrId: "f1", id: "s1" }, ctx) as {
    deleted: boolean;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/forms/f1/submissions/s1");
  assertEquals(out.deleted, true);
});

Deno.test("delete-form-submission: declares idempotent true", () => {
  assertEquals(deleteFormSubmission.idempotent, true);
});

import { assertEquals } from "@std/assert";
import submissionDelete from "../../actions/submission-delete.ts";
import { mockCtx, pathOf, problem } from "../_helpers.ts";

Deno.test("submission-delete: DELETE /submissions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await submissionDelete.execute({ submissionId: "sub_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/public/v1/submissions/sub_1");
  assertEquals(out, { deleted: true, id: "sub_1" });
});

Deno.test("submission-delete: a quarantined-spam 409 surfaces as its code", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: problem(409, "conflict", "Submission is quarantined spam"),
  }]);
  let msg = "";
  try {
    await submissionDelete.execute({ submissionId: "s" }, ctx);
  } catch (e) {
    msg = (e as Error).message;
  }
  assertEquals(msg, "Formspark 409 conflict: Submission is quarantined spam");
});

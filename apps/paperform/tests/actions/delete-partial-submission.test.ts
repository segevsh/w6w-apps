import { assertEquals } from "@std/assert";
import deletePartialSubmission from "../../actions/delete-partial-submission.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-partial-submission: DELETEs /v1/partial-submissions/{id}, no form scope needed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const out = await deletePartialSubmission.execute({ id: "ps1" }, ctx) as { deleted: boolean };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/partial-submissions/ps1");
  assertEquals(out.deleted, true);
});

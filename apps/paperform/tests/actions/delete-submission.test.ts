import { assertEquals } from "@std/assert";
import deleteSubmission from "../../actions/delete-submission.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("delete-submission: DELETEs /v1/submissions/{id}, no form scope needed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "ok" } }]);
  const out = await deleteSubmission.execute({ id: "s1" }, ctx) as { deleted: boolean };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/submissions/s1");
  assertEquals(out.deleted, true);
});

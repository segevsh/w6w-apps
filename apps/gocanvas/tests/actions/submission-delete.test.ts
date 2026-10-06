import { assertEquals } from "@std/assert";
import action from "../../actions/submission-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("submission-delete: DELETE /api/v3/submissions/691911 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "message": "ok" } }]);
  const out = await action.execute({ "submissionId": "691911" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v3/submissions/691911");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "message": "ok" });

  const hard = mockCtx([{ body: { message: "gone" } }]);
  await action.execute({ submissionId: "G-9", hardDelete: true }, hard.ctx);
  assertEquals(pathOf(hard.calls[0].url), "/api/v3/submissions/G-9");
  assertEquals(queryOf(hard.calls[0].url), { hard_delete: "true" });
});

import { assertEquals } from "@std/assert";
import action from "../../actions/submission-revision-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("submission-revision-list: GET /api/v3/submissions/691911/revisions with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "revision_number": 0 }] }]);
  const out = await action.execute({ "submissionId": 691911 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/submissions/691911/revisions");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, [{ "revision_number": 0 }]);
});

import { assertEquals } from "@std/assert";
import action from "../../actions/submission-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("submission-get: GET /api/v3/submissions/02ED5FB2-9C61-4F18-AB17-543547DF899B with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 691911 } }]);
  const out = await action.execute(
    { "submissionId": "02ED5FB2-9C61-4F18-AB17-543547DF899B" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/submissions/02ED5FB2-9C61-4F18-AB17-543547DF899B");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 691911 });
});

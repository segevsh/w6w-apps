import { assertEquals } from "@std/assert";
import action from "../../actions/project-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-update: PATCH /api/v3/projects/21 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 21 } }]);
  const out = await action.execute(
    { "projectId": 21, "status": "inactive", "endDate": "2024-03-01" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/21");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), { "status": "inactive", "end_date": "2024-03-01" });
  assertEquals(out, { "id": 21 });
});

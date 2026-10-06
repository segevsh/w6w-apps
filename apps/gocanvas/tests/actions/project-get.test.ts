import { assertEquals } from "@std/assert";
import action from "../../actions/project-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("project-get: GET /api/v3/projects/11 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 11 } }]);
  const out = await action.execute({ "projectId": 11 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects/11");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": 11 });
});

import { assertEquals } from "@std/assert";
import action from "../../actions/project-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-list: GET /api/v3/projects with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }] }]);
  const out = await action.execute({ "page": 1 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/projects");
  assertEquals(queryOf(calls[0].url), { "page": "1" });
  assertEquals(calls[0].body, null);
  assertEquals((out as { items: unknown }).items, [{ "id": 1 }]);
});

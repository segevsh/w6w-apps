import { assertEquals } from "@std/assert";
import action from "../../actions/user-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-list: GET /api/v3/users with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1 }] }]);
  const out = await action.execute({ "enabled": false, "page": 3 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/users");
  assertEquals(queryOf(calls[0].url), { "enabled": "false", "page": "3" });
  assertEquals(calls[0].body, null);
  assertEquals((out as { items: unknown }).items, [{ "id": 1 }]);
});

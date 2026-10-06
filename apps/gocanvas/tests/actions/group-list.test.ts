import { assertEquals } from "@std/assert";
import action from "../../actions/group-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("group-list: GET /api/v3/groups with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "id": 1873 }] }]);
  const out = await action.execute({ "departmentId": 4 } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/groups");
  assertEquals(queryOf(calls[0].url), { "department_id": "4" });
  assertEquals(calls[0].body, null);
  assertEquals((out as { items: unknown }).items, [{ "id": 1873 }]);
});
